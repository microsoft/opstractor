# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import pkgutil
import subprocess
import sys

from dis import Bytecode
from types import ModuleType
from textwrap import dedent
import os

def find_runnable_modules(module: ModuleType):
  for pkg in pkgutil.walk_packages(module.__path__, f'{module.__name__}.'):
    state = 0
    importer = pkgutil.ImpImporter(pkg.module_finder.path)
    
    for i in Bytecode(importer.find_module(pkg.name).get_code()):
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
  output_file = f'profiles/{module}.bin'
  if os.path.exists(output_file):
    print(f'Skipping since {output_file} already exists')
    continue

  if module == 'labml_nn.cfr.kuhn':
    continue

  print(f'Working on module: {module}')
  script = dedent(f'''
    import torch
    import torch_opstractor
    torch_opstractor.default_session.init('{module}', '{output_file}')
    from {module} import main
    main()
  ''')
  result = subprocess.run([sys.executable, '-c', script])

  if result.returncode != 0:
    print(f'Error {result.returncode} deleting file {output_file}')
    os.remove(output_file)