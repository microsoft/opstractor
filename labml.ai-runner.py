# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import pkgutil
import subprocess
import sys

from dis import Bytecode
from types import ModuleType
from textwrap import dedent

def find_runnable_modules(module: ModuleType):
  for pkg in pkgutil.walk_packages(module.__path__, f'{module.__name__}.'):
    state = 0
    for i in Bytecode(pkg.module_finder.get_code(pkg.name)):
      if state == 0 and i.opname == 'LOAD_NAME' and i.argval == '__name__':
        state = 1
      elif state == 1 and i.opname == 'LOAD_CONST' and i.argval == '__main__':
        state = 2
      elif state == 2 and i.opname == 'COMPARE_OP' and i.argval == '==':
        yield pkg.name
        break
      else:
        state = 0

for module in find_runnable_modules(__import__('labml_nn')):
  if module == 'labml_nn.cfr.kuhn':
    continue

  script = dedent(f'''
    import torch
    import torch_opstractor
    torch_opstractor.default_session.init('{module}', 'profiles/{module}.bin')
    from {module} import main
    main()
  ''')
  subprocess.run([sys.executable, '-c', script])