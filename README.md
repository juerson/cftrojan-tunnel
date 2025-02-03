将`_worker.js`或`_worker_清爽版.js`代码托管到Cloudflare的Workers或Pages后，按照下面内容操作。

### 一、在Cloudflare中设置环境变量：

| **变量名称**    | **说明**                                                     |
| --------------- | ------------------------------------------------------------ |
| PASS_CODE       | (必须) 没有经过sha224加密的密码，在**代码**或**环境变量**中设置，比如：0648919d-8bf1-4d4c-8525-36cf487506ec、f3mkT3C6 |
| LANDING_ADDRESS | (非必须) 不设置，一些网站无法打开，可在**代码**或**环境变量**中设置，格式：(Sub-)Domain:PORT、IPv4:PORT、[IPv6]:PORT（没有端口，默认是443端口） |
| CONFIG_PASSWORD | (可选) 部署订阅版的，才用到这个变量，通过后面的链接查看v2ray、singbox、clash的配置例子，可在**代码**或**环境变量**中设置。使用：`http://your_worker_domain/config?pwd={CONFIG_PASSWORD}` |
| SUB_PASSWORD    | (可选) 部署订阅版的，才用到这个变量，通过后面的链接可以查看订阅（支持v2ray、singbox、clash三种订阅）。使用：`https://your_worker_domain/sub?pwd={SUB_PASSWORD}&target={v2ray singbox clash}`，注意：订阅中所用到的ipaddr数据要修改成自己的，要不然订阅的内容一直都会不变的。 |

#### 1、部署清爽版代码，要用到的环境变量

<img src="images\环境变量1.png" />



#### 2、部署订阅版代码，要用到的环境变量

<img src="images\环境变量2.png" />

注意：使用Pages方法部署的，添加、修改`环境变量`，要重新部署Pages才生效。

### 二、订阅版，怎么查看v2ray、singbox、clash它们的配置例子：

- 使用例子

```
https://a.abc.workers.dev/config?pwd=123456  # 假如123456是CF后台中，环境变量CONFIG_PASSWORD设置的值
```

### 三、订阅版，怎么使用订阅：

| 参数            | 含义                                                         |
| --------------- | ------------------------------------------------------------ |
| pwd             | (必须) 查看订阅的密码，密码是CF后台中环境变量SUB_PASSWORD设置的值 |
| target          | (可选) target=v2ray、singbox、clash，分别是v2ray分享链接的订阅、singbox的订阅、clash的订阅 |
| page            | (可选) 页码，默认为1，显示哪一页的v2ray、singbox、clash订阅内容？ |
| port            | (可选) 修改trojan的port值                                    |
| host            | (可选) 修改trojan的sni和host的值，几乎不用                   |
| maxNode/maxnode | (可选) 修改每页最多写多少个节点，脚本会计算每页的节点数(平均数)，v2ray分享链接默认为1000，可选1-5000；clash默认为300，可选1-1000；singbox默认50，可选1~100 |

#### 1、v2ray订阅，使用例子：

```
https://a.abc.workers.dev/sub?pwd=123456&target=v2ray                    # 第一页的trojan节点
https://a.abc.workers.dev/sub?pwd=123456&target=v2ray&page=2              # 翻页，存在其它页，每页最多1000节点
https://a.abc.workers.dev/sub?pwd=123456&target=v2ray&port=2053           # 改为其它端口
https://a.abc.workers.dev/sub?pwd=123456&target=v2ray&hostName=githu.com  # 修改节点信息中的sni和host值
https://a.abc.workers.dev/sub?pwd=123456&target=v2ray&page=2&maxNode=200  # 跟其它参数组合
```

#### 2、Clash订阅，使用例子：

```
https://a.abc.workers.dev/sub?pwd=123456&target=clash                     # 第一页的clash配置
https://a.abc.workers.dev/sub?pwd=123456&target=clash&page=2              # 翻页，存在其它页，每页最多300节点
https://a.abc.workers.dev/sub?pwd=123456&target=clash&port=2053           # 改为其它端口
https://a.abc.workers.dev/sub?pwd=123456&target=clash&hostName=github.com  # 修改节点信息中的sni和host值
https://a.abc.workers.dev/sub?pwd=123456&target=clash&page=2&maxNode=200
```
#### 3、Singbox订阅，使用例子：

```
https://a.abc.workers.dev/sub?pwd=123456&target=singbox                     # 第一页的singbox配置
https://a.abc.workers.dev/sub?pwd=123456&target=singbox&page=2              # 翻页，存在其它页，每页最多50节点
https://a.abc.workers.dev/sub?pwd=123456&target=singbox&port=2053           # 改为其它端口
https://a.abc.workers.dev/sub?pwd=123456&target=singbox&hostName=github.com  # 修改节点信息中的sni和host值
https://a.abc.workers.dev/sub?pwd=123456&target=singbox&page=2&maxNode=30
```


注意：

(1) 前面的参数可以随意组合，只要参数是前面表格中的，都可以全部使用。

(2) 使用 workers.dev （trojan-ws）生成的 clash 配置文件不能使用（这种情况，在js代码中，已经禁止生成clash订阅），必须 `trojan+ws+tls`的才能使用。

(3) Trojan协议的节点生成的 clash 订阅使用时，LANDING_ADDRESS因某个原因丢失，一些网站（比如：ChatGPT、Cloudflare）无法打开，目前还不知道是什么原因导致的。

### 四、（可选）订阅版，巧用GitHub的私有仓库，隐藏您的反代IP、域名

如果您花费大量时间，收集一些反代IP、域名，被别人白嫖，而且您当前的网络环境抢不过别人，导致网速大不如以前，气不气？现在你不用为其烦恼，下面使用 GitHub 的私有仓库，将您收集的反代IP、域名的文件隐藏起来，只有对应的 token 才能访问，减少文件内容泄露的风险，保护您收集到的反代IP、域名。

##### 4.1 设置访问GitHub私有文件所需的参数（有两种方法）

- 第一种方法：在 Cloudflare Workers/Pages 中设置变量（推荐）


| 参数             | 含义                                                         |
| ---------------- | ------------------------------------------------------------ |
| GITHUB_TOKEN     | （必须）GitHub访问令牌，用于授权请求（获取方法，在后面）     |
| GITHUB_OWNER     | （必须）仓库所有者的用户名，填您的GitHub用户名               |
| GITHUB_REPO      | （必须）私有文件所在的仓库名称                               |
| GITHUB_BRANCH    | （可选）私有文件所在的分支名称，默认是main，如果您创建了其它分支，就改为您创建的分支名称 |
| GITHUB_FILE_PATH | （必须）私有文件所在的路径（是相对路径，不是绝对路径）       |

<img src="images\GitHub相关变量.png" />

- 第二种方法：在`_worker.js`源码中设置默认值（不推荐）

  与前面设置变量效果一样，名称不同而已，该方法可能会泄露您的 GitHub token。

<img src="images\GitHub相关变量2.png" />

注意：代码所在的行数可能跟这里不同。

##### 4.2 GITHUB_TOKEN 值怎么获取？

1、获取 GitHub token 的地址：[link](https://github.com/settings/tokens)

2、获取 GitHub token 的教程

- 【官方版】创建 personal access token (classic) 的教程：[link](https://docs.github.com/zh/enterprise-server@3.10/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#%E5%88%9B%E5%BB%BA-personal-access-token-classic)
- 如何在 GitHub 生成经典的个人访问令牌(token)：[link](https://medium.com/@mbohlip/how-to-generate-a-classic-personal-access-token-in-github-04985b5432c7)

##### 4.3 优选的cf ip、反代IP、域名，格式如下

```txt
time.cloudflare.com
time.is
ip.sb
172.64.229.197
104.19.106.250
104.19.124.30
104.19.206.63
104.18.200.122
104.19.113.92
172.64.203.72
172.64.53.56
```
注意：不支持在文件中添加对应的端口，也不支持csv文件。

### 五、（可选）通过path指定LANDING_ADDRESS

在v2rayN中，修改path的值，指定landingAddress值；也可以在singbox、clash订阅中，修改对应节点path键的值。

**支持格式：** ipv4、ipv4:port、[ipv6]、[ipv6]:port、domain.com、sub1.domain.com、sub2.sub1.domain.com、subN..sub1.domain.com

**注意：** 没有端口，默认使用443端口，其它端口需要写出来。

<img src="images\path设置proxyip.png" />

域名：

```
/pyip=speed.cloudflare.com
/pyip=speed.cloudflare.com:443
```

IPv4地址：

```
/pyip=192.168.1.1
/pyip=192.168.1.1:443
```

IPv6地址：

```
/pyip=[fe80::c789:ece7:5079:3406]
/pyip=[fe80::c789:ece7:5079:3406]:443
```

注意：以上的LANDING_ADDRESS，仅用于举例。

### 六、温馨提示

1、特此提醒`dist/worker_清爽版.js` 代码经过js混淆得到 `_worker_清爽版.js`，`dist/worker_订阅版.js` 代码经过js混淆得到 `_worker.js`，要清楚自己部署那个代码。

2、路径`src/worker.js`中的代码为开发中写的代码，大部代码根据[@ca110us](https://github.com/ca110us/epeius/blob/main/src/worker.js)修改而来，如果不是开发者，使用`_wokers.js`的代码，简单修改一下前面提到的环境变量，部署到cloudflare wokers或pages就可以使用。

3、部署时，有几率遇到Error 1101错误，建议将原js代码进行混淆[Link](https://houbb.github.io/jsf/c/)，如果js混淆后，依然无法解决问题，就等开发者遇到该问题且有时间再解决这个问题。

<img src="images\Error 1101.png" />

### 七、免责声明

该项目仅供学习/研究目的，用户对法律合规和道德行为负责，作者对任何滥用行为概不负责。
