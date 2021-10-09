from labml_nn.capsule_networks.mnist import main
#import torch_opstractor

import torch
with torch.profiler.profile(
  activities=[torch.profiler.ProfilerActivity.CPU]) as p:
  main()
  print(p.key_averages().table(sort_by="self_cuda_time_total", row_limit=-1))
# ones = torch.ones([4, 5])
# print(ones.device)
# twos = ones + ones
# print(twos)