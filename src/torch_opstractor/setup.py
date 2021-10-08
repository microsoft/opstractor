# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import os
import subprocess
from glob import glob
from setuptools import setup
from shutil import rmtree
from distutils.cmd import Command
from torch.utils.cpp_extension import BuildExtension, CppExtension

selfdir = os.path.dirname(os.path.realpath(__file__))
protobufdir = os.path.realpath(os.path.join(selfdir, '..'))
builddir = os.path.join(selfdir, 'build')

sources = glob(os.path.join(selfdir, '*.cpp'))

clean_paths = \
  glob(os.path.join(selfdir, 'torch_opstractor', '*.so')) + \
  glob(os.path.join(selfdir, 'torch_opstractor', '__pycache__')) + \
  glob(os.path.join(selfdir, '*.egg-info')) + \
  [builddir]

extra_compiler_args = [
  '-Wall',
  '-Werror',
  '-Wno-unused-function',
  '-std=c++17'
]

class build_ext(BuildExtension):
  def __init__(self, *args, **kwargs):
    # force gcc since pytorch binaries are built with gcc, not clang
    os.environ['CXX'] = 'g++'
    super().__init__(*args, **kwargs)

  def exec(self, *args, **kwargs):
    print(' '.join(args))
    subprocess.run(args, **kwargs).check_returncode()

  def run(self, *args, **kwargs):
    os.makedirs(builddir, exist_ok=True)
    return super().run(*args, **kwargs)

class clean(Command):
  """
  deeply cleans all build artifacts in an energizing and refreshing manner
  """
  description = __doc__.strip()
  user_options = []
  def initialize_options(self): pass
  def finalize_options(self): pass
  def run(self):
    for path in clean_paths:
      path = os.path.realpath(path)
      if os.path.isdir(path):
        print(f'Removing {path}{os.sep}')
        rmtree(path)
      elif os.path.exists(path):
        print(f'Removing {path}')
        os.unlink(path)

setup(
  name='torch_opstractor',
  packages=['torch_opstractor'],
  ext_modules=[
    CppExtension(
      name='torch_opstractor._C',
      sources=sources,
      libraries=[],
      extra_compile_args=extra_compiler_args,
      include_dirs=[],
      library_dirs=[],
      extra_objects=[])
    ],
  cmdclass={
    'build_ext': build_ext,
    'clean': clean
  })