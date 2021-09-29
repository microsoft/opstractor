// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#include <torch/extension.h>

#include "interrupt.h"
#include "session.h"

using namespace std::chrono;

namespace opstractor {

class TracerObserverContext final : public at::ObserverContext {
  const time_point<high_resolution_clock> start_time_;

public:
  explicit TracerObserverContext() :
    start_time_(high_resolution_clock::now()) {
  }

  const duration_t duration() const {
    return high_resolution_clock::now() - start_time_;
  }
};

class PyTorchSession final : public Session {
protected:
  const std::shared_ptr<Op> filterOp(
    const std::shared_ptr<Op> op) const override {
    if (op == nullptr
      || op->name() == "aten::stack"
      || op->name() == "StackBackward") {
      return nullptr;
    }
    return op;
  }
};

static PyTorchSession session{};

static std::unique_ptr<at::ObserverContext> onFunctionEnter(
  const at::RecordFunction& fn) {
  auto user_data = std::make_unique<TracerObserverContext>();
  session.pushOp(
    fn.name().str(),
    (OpScope)fn.scope(),
    user_data.get());
  return user_data;
}

static void onFunctionExit(
  const at::RecordFunction& fn,
  at::ObserverContext* fn_ctx) {
  session.popOp(
    static_cast<TracerObserverContext*>(fn_ctx)->duration(),
    fn_ctx);
}

PYBIND11_MODULE(torch_opstractor, torch_opstractor_module) {
  at::addGlobalCallback(
    at::RecordFunctionCallback(
      onFunctionEnter,
      onFunctionExit)
      .scopes({
        at::RecordScope::FUNCTION,
        at::RecordScope::BACKWARD_FUNCTION
      }));
}

} // namespace opstractor