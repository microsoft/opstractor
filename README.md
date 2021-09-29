# Opstractor

> _**NOTE:** this tool is under early and active development. Use at your own
> risk, and see [Support](SUPPORT.md) for more details._

_**Opstractor**_ is simple PyTorch extension for extracting operator coverage from
running models to help prioritize device-specific implementations of operators.
Currently this is intended as an internal tool for building out
[eager mode support in PyTorch and ONNX Runtime][ort-eager].

## Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a [Contributor License Agreement][ms-cla] (CLA) declaring that
you have the right to, and actually do, grant us the rights to use your
contribution.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g.,
status check, comment). Simply follow the instructions provided by the bot.
You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct][ms-coc].
For more information see the [Code of Conduct FAQ][ms-coc-faq] or contact
[opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional
questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or
services. Authorized use of Microsoft trademarks or logos is subject to and
must follow [Microsoft's Trademark & Brand Guidelines][ms-brand]. Use of
Microsoft trademarks or logos in modified versions of this project must not
cause confusion or imply Microsoft sponsorship. Any use of third-party
trademarks or logos are subject to those third-party's policies.

[ort-eager]: https://github.com/microsoft/onnxruntime/tree/master/orttraining/orttraining/eager
[ms-cla]: https://cla.opensource.microsoft.com
[ms-coc]: https://opensource.microsoft.com/codeofconduct
[ms-coc-faq]: https://opensource.microsoft.com/codeofconduct/faq
[ms-brand]: https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general