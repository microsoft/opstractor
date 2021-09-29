// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#pragma once

#include "op.h"

namespace opstractor {

class OpWriter {
  std::ostream& ostream_;

public:
  explicit OpWriter() = delete;

  explicit OpWriter(std::ostream& ostream) :
    ostream_(ostream) {
  }

  void write(const std::shared_ptr<Op>& op) const {
    writeStart(op);
    writeProperties(op);
    auto children = op->children();
    if (children.size() > 0) {
      writeStartChildren(op);
      for (std::size_t i = 0, n = children.size(); i < n; i++) {
        write(children[i]);
        if (i < n - 1) {
          writeChildDelimeter();
        }
      }
      writeEndChildren(op);
    }
    writeEnd(op);
  }

protected:
  inline std::ostream& out() const noexcept {
    return ostream_;
  }

  virtual void writeStart(const std::shared_ptr<Op>& op) const = 0;
  virtual void writeProperties(const std::shared_ptr<Op>& op) const = 0;
  virtual void writeStartChildren(const std::shared_ptr<Op>& op) const = 0;
  virtual void writeChildDelimeter() const = 0;
  virtual void writeEndChildren(const std::shared_ptr<Op>& op) const = 0;
  virtual void writeEnd(const std::shared_ptr<Op>& op) const = 0;
};

class JsonWriter : public OpWriter {
public:
  explicit JsonWriter(std::ostream& ostream)
    : OpWriter(ostream) {
  }

protected:
  inline void jsonStartObject() const { out() << '{'; }
  inline void jsonEndObject()   const { out() << '}'; }
  inline void jsonStartArray()  const { out() << '['; }
  inline void jsonEndArray()    const { out() << ']'; }
  inline void jsonComma()       const { out() << ','; }

  inline void jsonProperty(const std::string& property_name) const {
    jsonValue(property_name);
    out() << ':';
  }

  template <typename T>
  inline void jsonValue(T value) const {
    out() << value;
  }

  inline void jsonValue(const std::string& value) const {
    jsonValue(value.c_str());
  }

  void jsonValue(const char* value) const {
    auto *p = value;

    if (p == nullptr) {
      out() << "null";
      return;
    }

    out() << '"';

    while (*p) {
      switch (*p) {
      case '"': out() << "\\\""; break;
      case '\\': out() << "\\\\"; break;
      case '\b': out() << "\\b"; break;
      case '\f': out() << "\\f"; break;
      case '\n': out() << "\\n"; break;
      case '\r': out() << "\\r"; break;
      case '\t': out() << "\\t"; break;
      default: out() << *p; break;
      }
      p++;
    }

    out() << '"';
  }
};

class FlameGraphWriter : public JsonWriter {
public:
  explicit FlameGraphWriter(std::ostream& ostream)
    : JsonWriter(ostream) {
  }

  void writeStart(const std::shared_ptr<Op>& op) const override {
    jsonStartObject();
  }

  void writeProperties(const std::shared_ptr<Op>& op) const override {
    jsonProperty("name");
    jsonValue(op->name());
    jsonComma();
    jsonProperty("value");
    jsonValue(std::chrono::nanoseconds(op->duration()).count());
  }

  void writeStartChildren(const std::shared_ptr<Op>& op) const override {
    jsonComma();
    jsonProperty("children");
    jsonStartArray();
  }

  void writeChildDelimeter() const override {
    jsonComma();
  }

  void writeEndChildren(const std::shared_ptr<Op>& op) const override {
    jsonEndArray();
  }

  void writeEnd(const std::shared_ptr<Op>& op) const {
    jsonEndObject();
  }
};

} // namespace opstractor