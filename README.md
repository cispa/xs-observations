# XS-Observations

This repository contains the code for our paper: "The Leaky Web: Automated Discovery of Cross-Site Information Leaks in Browsers and the Web".
The code is split up in the Test Browser Framework (TBF; Chapter III) and the Does-it-leak Pipeline (DIL; Chapter IV).

## [Test Browser Framework](tbf/README.md)
Automatically discover observation channels in browsers that leak information cross-site and create decision trees to visualize the leak capabilities of the observation channels. More details and explanations on how to run and extend the framework are in the [TBF Readme](tbf/README.md).

## [Does-it-leak Pipeline](dil/README.md)
Scan websites for XS-Leaks in a fully automatic manner (visit inference, cookie acceptance inference, and custom states such as login).
More details in the [DIL Readme](dil/README.md).