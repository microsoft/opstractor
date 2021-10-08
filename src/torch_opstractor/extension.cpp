// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#include <torch/extension.h>
#include <pybind11/functional.h>

namespace opstractor {

using OpClock = std::chrono::high_resolution_clock;
using OpDuration = OpClock::duration;

using OpHandle = uint64_t;

class Op final {
  const OpHandle handle_;
  const std::string name_;
  const std::optional<const std::string> schema_;

public:
  explicit Op(
    OpHandle handle,
    const std::string name,
    const std::optional<const std::string> schema) :
      handle_(handle),
      name_(name),
      schema_(schema) {
  }

  OpHandle handle() const {
    return handle_;
  }

  const std::string& name() const {
    return name_;
  }

  const std::optional<const std::string>& schema() const {
    return schema_;
  }

  static void pyBind(py::module& m) {
    py::class_<Op, std::shared_ptr<Op>>(m, "Op", py::is_final{})
      .def_property_readonly("handle", &Op::handle)
      .def_property_readonly("name", &Op::name)
      .def_property_readonly("schema", &Op::schema);
  }
};

class OpTable final {
  using SchemaToOpMap = std::map<
    const std::pair<
      const std::string,
      std::optional<const std::string>>,
    const std::shared_ptr<Op>>;
  SchemaToOpMap schemas_to_ops_{};

  using HandleToOpMap = std::map<
    uint64_t,
    const std::shared_ptr<Op>>;
  HandleToOpMap handles_to_ops_{};

public:
  const std::shared_ptr<Op> getOrRegister(
    const std::string name,
    const std::optional<const std::string> schema) {
    const auto key = std::make_pair(name, schema);
    const auto lower_bound = schemas_to_ops_.lower_bound(key);

    if (lower_bound != schemas_to_ops_.end() &&
      !schemas_to_ops_.key_comp()(key, lower_bound->first)) {
      return lower_bound->second;
    }

    const auto& op = schemas_to_ops_.insert(
      lower_bound,
      SchemaToOpMap::value_type(
        key,
        std::make_shared<Op>(
          schemas_to_ops_.size() + 1,
          name,
          schema)))->second;

    handles_to_ops_.insert(
      std::make_pair(op->handle(), op));

    return op;
  }

  const std::shared_ptr<Op> get(OpHandle handle) const {
    const auto lower_bound = handles_to_ops_.lower_bound(handle);
    if (lower_bound == handles_to_ops_.end() ||
      handles_to_ops_.key_comp()(handle, lower_bound->first)) {
      return nullptr;
    }
    return lower_bound->second;
  }
};

class OpCall final {
  const std::shared_ptr<const Op> op_;
  const OpDuration time_;

public:
  explicit OpCall(
    std::shared_ptr<const Op> op,
    OpDuration time) :
      op_(op),
      time_(time) {
  }

  const std::shared_ptr<const Op> op() const {
    return op_;
  }

  OpDuration time() const {
    return time_;
  }

  int64_t timeNs() const {
    return std::chrono::nanoseconds(time_).count();
  }

  static void pyBind(py::module& m) {
    py::class_<OpCall, std::shared_ptr<OpCall>>(m, "OpCall", py::is_final{})
      .def_property_readonly("op", &OpCall::op)
      .def_property_readonly("time_ns", &OpCall::timeNs);
  }
};

class OpRet final {
  const std::shared_ptr<const OpCall> call_;
  const OpDuration duration_;

public:
  explicit OpRet(
    std::shared_ptr<const OpCall> call,
    OpDuration duration) :
      call_(call),
      duration_(duration) {
  }

  const std::shared_ptr<const OpCall> call() const {
    return call_;
  }

  OpDuration duration() const {
    return duration_;
  }

  int64_t durationNs() const {
    return std::chrono::nanoseconds(duration_).count();
  }

  static void pyBind(py::module& m) {
    py::class_<OpRet, std::shared_ptr<OpRet>>(m, "OpRet", py::is_final{})
      .def_property_readonly("call", &OpRet::call)
      .def_property_readonly("duration_ns", &OpRet::durationNs);
  }
};

class OpstractorObserverContext final : public at::ObserverContext {
  const std::shared_ptr<OpCall> call_;

public:
  explicit OpstractorObserverContext(
    const std::shared_ptr<OpCall> call) :
      call_(call) {
  }

  const std::shared_ptr<OpCall> call() const {
    return call_;
  }
};

static const std::optional<const std::string> getOpSchema(
  const at::RecordFunction& fn) {
  if (fn.operator_name().has_value()) {
    const auto op = c10::Dispatcher::singleton().findOp(
      fn.operator_name().value());
    if (op.has_value() && op.value().hasSchema()) {
      return toString(op.value().schema());
    }
  }
  return {};
}

using PyOpCallFunc = std::function<void(const std::shared_ptr<OpCall>)>;
using PyOpRetFunc = std::function<void(const std::shared_ptr<OpRet>)>;

// FIXME: default handlers should raise an exception
// to indicate install_session_hooks was not called
static PyOpCallFunc py_op_call_ = [](auto call){};
static PyOpRetFunc py_op_ret_ = [](auto ret){};

static OpTable op_table{};
static std::optional<std::chrono::time_point<OpClock>> first_call_time_{};

PYBIND11_MODULE(_C, m) {
  Op::pyBind(m);
  OpCall::pyBind(m);
  OpRet::pyBind(m);

  m.def(
    "install_session_hooks",
    [](PyOpCallFunc op_call, PyOpRetFunc op_ret) {
      py_op_call_ = op_call;
      py_op_ret_ = op_ret;
    },
    py::arg("op_call") = nullptr,
    py::arg("op_ret") = nullptr)
  .def(
    "terminate_session",
    [](int exit_code) {
      std::exit(exit_code);
    },
    py::arg("exit_code") = 0);

  at::addThreadLocalCallback(at::RecordFunctionCallback(
    [](const at::RecordFunction& fn) -> std::unique_ptr<at::ObserverContext> {
      const auto now_time = OpClock::now();
      if (!first_call_time_.has_value()) {
        first_call_time_ = now_time;
      }

      const auto call = std::make_shared<OpCall>(
        op_table.getOrRegister(
          fn.name().str(),
          getOpSchema(fn)),
        now_time - first_call_time_.value());

      py_op_call_(call);

      return std::make_unique<OpstractorObserverContext>(call);
    },
    [](const at::RecordFunction& fn, at::ObserverContext* fn_ctx) {
      const auto now_time = OpClock::now() - first_call_time_.value();

      if (fn_ctx != nullptr) {
        const auto call = dynamic_cast<OpstractorObserverContext*>(
          fn_ctx)->call();

        py_op_ret_(std::make_shared<OpRet>(
          call,
          now_time - call->time()));
      }
    })
    .scopes({
      at::RecordScope::FUNCTION,
      at::RecordScope::BACKWARD_FUNCTION
    })
    .needsInputs(true)
    .needsOutputs(true));
}

} // namespace opstractor