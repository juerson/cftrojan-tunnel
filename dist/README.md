This folder contains the built output assets for the worker "cftrojan-tunnel-worker" generated at 2024-11-29T23:21:05.019Z.

1、清爽版。只保留基本的功能和修改poxyIP功能，移除查看节点配置和订阅的相关代码

2、解决Error 1101错误页面。发现代码中变量名称含有“proxy”单词的，以及泛滥的域名['bpb.yousef.isegaro.com', 'cdn-all.xn--b6gac.eu.org', 'cdn-b100.xn--b6gac.eu.org', 'proxyip.sg.fxxk.dedyn.io'] （可能被盯上了）有几率出现Error 1101错误页面

### 环境变量：

LANDING_ADDRESS => poxyIP

PASS_CODE => 没有经过SHA224编码的原始密码



### Path

节点Path传入的proxyIP，改为：/pyip=