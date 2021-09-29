// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#pragma once

#include <memory>
#include <vector>
#include <chrono>
#include <functional>
#include <iostream>

using duration_t = std::chrono::high_resolution_clock::duration;

enum class OpScope : uint8_t {
  Function = 0,
  BackwardFunction = 1,
  Model = 100
};

class Op final : public std::enable_shared_from_this<Op> {
  static std::size_t next_id_;

  const std::size_t id_;
  const std::string name_;
  const OpScope scope_;
  const std::shared_ptr<Op> parent_;
  const void* user_data_;

  std::vector<std::shared_ptr<Op>> children_;
  std::size_t invocation_count_;
  duration_t duration_;

public:
  explicit Op() = delete;

  explicit Op(
    std::string name,
    OpScope scope,
    std::shared_ptr<Op> parent,
    const void* user_data) :
    id_(next_id_++),
    name_(name),
    scope_(scope),
    parent_(parent),
    user_data_(user_data),
    children_({}),
    invocation_count_(0),
    duration_(duration_t::zero()) {
  }

  inline const std::size_t id() const noexcept {
    return id_;
  }

  inline const std::string& name() const noexcept {
    return name_;
  }

  inline const OpScope scope() const noexcept {
    return scope_;
  }

  inline const std::shared_ptr<Op> parent() const noexcept {
    return parent_;
  }

  inline const void* userData() const noexcept {
    return user_data_;
  }

  inline const std::vector<std::shared_ptr<Op>> children() const noexcept {
    return children_;
  }

  inline const std::size_t invocationCount() const noexcept {
    return invocation_count_;
  }

  inline const duration_t duration() const noexcept {
    return duration_;
  }

  void addInvocation(duration_t invocation_duration) noexcept {
    duration_ += invocation_duration;
    invocation_count_++;
  }

  void pushChild(std::shared_ptr<Op> child) {
    children_.push_back(child);
  }

  void merge(std::shared_ptr<Op> other) {

  }

  void write(std::ostream& writer) const {
    writer << "\"" << name_ << "\"";
    if (children_.size() > 0) {
      writer << "->{";
      for (auto child : children_) {
        child->write(writer);
      }
      writer << "}";
    }
  }

  static bool traverse(
    const std::shared_ptr<const Op>& a,
    const std::shared_ptr<const Op>& b,
    const std::function<bool(
      const std::shared_ptr<const Op>&,
      const std::shared_ptr<const Op>&)>& visitor) {
    if (a == nullptr) {
      return false;
    }

    if (!visitor(a, b)) {
      return false;
    }

    if (b != nullptr && a->children_.size() != b->children_.size()) {
      return false;
    }

    for (std::size_t i = 0, n = a->children_.size(); i < n; i++) {
      if (!traverse(
        a->children_[i],
        b == nullptr ? nullptr : b->children_[i],
        visitor)) {
        return false;
      }
    }

    return true;
  }

  bool isSameByName(const std::shared_ptr<const Op> other) const {
    return traverse(shared_from_this(), other, [&](auto a, auto b) {
      return a->name_ == b->name_;
    });
  }

  std::size_t size() {
    std::size_t size = 0;
    traverse(shared_from_this(), nullptr, [&](auto a, auto b) {
      size++;
      return true;
    });
    return size;
  }
};

std::size_t Op::next_id_ = 0;