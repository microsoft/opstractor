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

static OpTable op_table{};

enum class OpCallScope : uint8_t {
  FUNCTION = 0,
  BACKWARD_FUNCTION,
  TORCHSCRIPT_FUNCTION,
  KERNEL_FUNCTION_DTYPE,
  LITE_INTERPRETER,
  USER_SCOPE
};

class OpCall final {
  std::shared_ptr<const Op> op_;
  OpCallScope scope_;
  const OpDuration time_;
  std::string inputs_;

const std::string dumpInput(const at::IValue& input)
{
  if (input.isTensor())
  {
    std::stringstream ss;
    ss << "Tensor(";
    const auto& sizes = input.toTensor().sizes();
    for (size_t i=0; i < sizes.size(); ++i)
    {
      ss << sizes[i];

      if (i < sizes.size() - 1)
      {
        ss << ", ";
      }
    }            
    ss << ")";
    return ss.str();
  }
  else if (input.isStorage()) 
  {
    return "Storage";
  }
  else if (input.isDouble())
  {
    return std::to_string(input.toDouble());
  }
  else if (input.isComplexDouble())
  {
    return "ComplexDouble";
  }
  else if (input.isInt())
  {
    return std::to_string(input.toInt());
  }
  else if (input.isBool())
  {
    return std::to_string(input.toBool());
  }
  else if (input.isTuple())
  {
    std::cout << "Tuple" << '\n';
  }
  else if (input.isString())
  {
    return input.toStringRef();
  }
  else if (input.isBlob())
  {
    return "Blob";
  }
  else if (input.isList())
  {
    std::stringstream ss;
    ss << "(";
    const auto& list = input.toList();
    
    for (size_t i=0; i < list.size(); ++i)
    {
      ss << dumpInput(list[i]);

      if (i < list.size() - 1)
      {
        ss << ",";
      }
    }
    ss << ")";

    return ss.str();
  }
  else if (input.isGenericDict())
  {
    return "GenericDict";
  }
  else if (input.isFuture())
  {
    return "Future";
  }
  else if (input.isDevice())
  {
    const auto& device = input.toDevice();
    std::stringstream ss;
    ss << "Device(" << device.type() << "," << std::to_string(device.index()) << ")";
    return ss.str();
  }
  else if (input.isStream())
  {
    return "Stream(" + std::to_string(input.toInt()) + ")";
  }
  else if (input.isObject())
  {
    return "Object";
  }
  else if (input.isPyObject())
  {
    return "PyObject";
  }
  else if (input.isCapsule())
  {
    return "Capsule";
  }
  else if (input.isRRef())
  {
    return "RRef";
  }
  else if (input.isQuantizer())
  {
    return "Quantizer";
  }
  else if (input.isGenerator())
  {
    return "Generator";
  }
  else if (input.isEnum())
  {
    return "Enum";
  }
  else if (input.isNone())
  {
    return input.toNone();
  }

  return "Unknown";
}

const std::optional<const std::string> getOpSchema(
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

public:
  explicit OpCall(
    const at::RecordFunction& fn,
    OpDuration time) :
      time_(time) {

      op_ = op_table.getOrRegister(
          std::string(fn.name()),
          getOpSchema(fn));

      scope_ = static_cast<OpCallScope>(fn.scope());      

      const auto& inputs = fn.inputs();
      std::stringstream input_ss;
      input_ss << "(";
      for (size_t i=0; i < inputs.size(); ++i)
      {
        input_ss << dumpInput(inputs[i]);

        if (i < inputs.size() - 1)
        {
          input_ss << ",";
        }
      }
      input_ss << ")";
      inputs_ = input_ss.str();
  }

  const std::shared_ptr<const Op> op() const {
    return op_;
  }

  const OpDuration time() const {
    return time_;
  }

  const std::string& inputs() const {
    return inputs_;
  }

  static void pyBind(py::module& m) {
    py::class_<OpCall, std::shared_ptr<OpCall>>(m, "OpCall", py::is_final{})
      .def_property_readonly("op", &OpCall::op)
      .def_property_readonly("inputs", &OpCall::inputs);
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

using PyOpCallFunc = std::function<void(const std::shared_ptr<OpCall>)>;
using PyOpRetFunc = std::function<void(const std::shared_ptr<OpRet>)>;

static PyOpCallFunc py_op_call_ = nullptr;
static PyOpRetFunc py_op_ret_ = nullptr;

static std::optional<std::chrono::time_point<OpClock>> first_call_time_{};

PYBIND11_MODULE(_C, py_module) {
  Op::pyBind(py_module);
  OpCall::pyBind(py_module);
  OpRet::pyBind(py_module);

  py_module
    .def(
      "install_session_hooks",
      [](PyOpCallFunc op_call, PyOpRetFunc op_ret) {
        py_op_call_ = std::move(op_call);
        py_op_ret_ = std::move(op_ret);
      },
      py::arg("op_call") = nullptr,
      py::arg("op_ret") = nullptr)
    .def(
      "terminate_session",
      [](int exit_code) {
        std::exit(exit_code);
      },
      py::arg("exit_code") = 0)
    .add_object("_cleanup", py::capsule([] {
      py_op_call_ = nullptr;
      py_op_ret_ = nullptr;
    }));

  at::addThreadLocalCallback(at::RecordFunctionCallback(
    [](const at::RecordFunction& fn) -> std::unique_ptr<at::ObserverContext> {
      if (py_op_call_ == nullptr) {
        return nullptr;
      }

      const auto now_time = OpClock::now();
      if (!first_call_time_.has_value()) {
        first_call_time_ = now_time;
      }

      const auto call = std::make_shared<OpCall>(
        fn,
        now_time - first_call_time_.value());

      py_op_call_(call);

      return std::make_unique<OpstractorObserverContext>(call);
    },
    [](const at::RecordFunction& fn, at::ObserverContext* fn_ctx) {
      const auto now_time = OpClock::now() - first_call_time_.value();

      if (fn_ctx != nullptr && py_op_ret_ != nullptr) {
        const auto call = dynamic_cast<OpstractorObserverContext*>(
          fn_ctx)->call();

        py_op_ret_(std::make_shared<OpRet>(
          call,
          now_time - call->time()));
      }
    })
    .scopes({
      at::RecordScope::FUNCTION,
      at::RecordScope::BACKWARD_FUNCTION,
      at::RecordScope::USER_SCOPE
    })
    .needsInputs(true)
    .needsOutputs(true));
}

} // namespace opstractor