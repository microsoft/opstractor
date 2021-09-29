// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <signal.h>

#include <iostream>

#include "interrupt.h"

namespace opstractor {
namespace {

static sighandler_t prev_sigint_handler = nullptr;
static std::function<void()> installed_sigint_handler = nullptr;

static void sigint_handler(int signal) {
  if (installed_sigint_handler != nullptr) {
    installed_sigint_handler();
  }

  if (prev_sigint_handler != nullptr &&
    prev_sigint_handler != SIG_DFL &&
    prev_sigint_handler != SIG_IGN) {
    prev_sigint_handler(signal);
  } else {
    ::exit(signal);
  }
}

static void ensure_posix_sigint_handler() {
  struct ::sigaction old_action;
  errno = 0;

  if (::sigaction(SIGINT, nullptr, &old_action) == 0) {
    if (old_action.sa_handler != sigint_handler) {
      prev_sigint_handler = ::signal(SIGINT, sigint_handler);
    }
  } else {
    std::cerr <<
      "unable to query SIGINT through sigaction: [" << errno << "] " <<
      ::strerror(errno) << std::endl;
  }
}

} // namespace <anonymous>

void ensure_keyboard_interrupt_handler(
  std::function<void()> callback) {
  installed_sigint_handler = callback;
  ensure_posix_sigint_handler();
}

} // namespace opstractor