# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import os
from glob import glob
from setuptools import setup
from torch.utils.cpp_extension import BuildExtension, CppExtension

# force gcc since pytorch binaries are built with gcc, not clang
os.environ['CXX'] = 'g++'

setup(
  name='torch_opstractor',
  ext_modules=[
    CppExtension(
      name='torch_opstractor',
      sources=glob('src/*.cpp'),
      extra_compile_args=['-std=c++17'],
      include_dirs=[],
      library_dirs=[],
      extra_objects=[])
    ],
  cmdclass={
    'build_ext': BuildExtension.with_options(
      use_ninja=True)
  })