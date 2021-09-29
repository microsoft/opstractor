// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#pragma once

#include <functional>

namespace opstractor {

void ensure_keyboard_interrupt_handler(
  std::function<void()> callback);

} // namespace opstractor