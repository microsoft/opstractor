// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#pragma once

#include <stack>
#include <vector>

#include "op.h"
#include "opwriter.h"

namespace opstractor {

class Session {
  std::stack<std::shared_ptr<Op>> op_stack{};
  std::vector<std::shared_ptr<Op>> distinct_ops{};
  std::size_t total_ops;

public:
  void pushOp(
    const std::string& name,
    const OpScope scope,
    const void* user_data = nullptr) {
    std::shared_ptr<Op> parent = nullptr;
    if (op_stack.size() > 0) {
      parent = op_stack.top();
    }

    auto op = std::make_shared<Op>(
      name,
      scope,
      parent,
      user_data);

    op_stack.push(op);
    if (parent != nullptr) {
      parent->pushChild(op);
    }
  }

  void popOp(
    duration_t duration,
    const void* expected_user_data = nullptr) {
    auto op = op_stack.top();
    op_stack.pop();

    if (op->userData() != expected_user_data) {
      throw std::runtime_error(
        "user data corresponding to the Op on the top of the stack does not "
        "match the supplied user data; pushOp/popOp calls may be unbalanced");
    }

    op->addInvocation(duration);

    if (op_stack.size() == 0) {
      filterLogOp(op);
    }
  }

protected:
  virtual const std::shared_ptr<Op> filterOp(
    const std::shared_ptr<Op> op) const {
    return op;
  }

  virtual void filterLogOp(const std::shared_ptr<Op> op) {
    auto filtered_op = filterOp(op);
    if (filtered_op != nullptr) {
      logOp(filtered_op);
    }
  }

  virtual void logOp(const std::shared_ptr<Op> op) {
    total_ops++;

    bool merged = false;

    for (auto distinct_op : distinct_ops) {
      if (distinct_op->isSameByName(op)) {
        distinct_op->merge(op);
        merged = true;
        break;
      }
    }

    if (!merged) {
      distinct_ops.push_back(op);
    }

    auto distinct = distinct_ops.size() / (double)total_ops;

    // std::cerr << distinct_ops.size() << " / " << total_ops << " (" << (distinct * 100.0) << "%)" << std::endl;
    if (distinct < 0.005) {
      auto root_op = std::make_shared<Op>(
        "model",
        OpScope::Model,
        nullptr,
        nullptr);

      for (auto distinct_op : distinct_ops) {
        root_op->pushChild(distinct_op);
      }

      FlameGraphWriter writer{std::cerr};
      writer.write(root_op);

      exit(0);
      return;
    }
  }
};


} // namespace opstractor