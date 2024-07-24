将`_worker.js`代码托管到Cloudflare的Workers或Pages后，按照下面内容操作。

### 一、在Cloudflare中设置环境变量：

使用workers部署的，在`设置 >> 变量 >> 环境变量  >> 添加变量`中，添加下面4个变量：

| **变量名称**    | **说明**                                                     |
| --------------- | ------------------------------------------------------------ |
| SHA224PASS      | （必须）也可以在代码中添加，比如：0648919d-8bf1-4d4c-8525-36cf487506ec、f3mkT3C6 |
| PROXYIP         | （可选）可以为空，或代码中修改，格式：域名或IP地址。比如：cdn.xn--b6gac.eu.org、cdn-all.xn--b6gac.eu.org、cdn-b100.xn--b6gac.eu.org等。 |
| CONFIG_PASSWORD | （可选）查看节点配置的密码(这里指trojan以及对应的clash.meta配置)，默认为空，无密码；使用：`http://your_worker_domain/config?pwd={CONFIG_PASSWORD}` |
| SUB_PASSWORD    | （可选）查看节点订阅的密码，默认为空，无密码；使用：`https://your_worker_domain/sub?pwd={SUB_PASSWORD}&target={v2ray/trojan or clash}` |

使用Pages部署的，在`设置 >> 环境变量 >> 制作 >> 添加变量`中，添加前面的4个变量。

<img src="images\cf变量.png" title="cloudflare workers中设置变量" />

注意：

1、Workers部署：添加、修改`环境变量`，立刻生效，如果没有生效，可能有延迟或浏览器缓存问题。

2、Pages部署：添加、修改`环境变量`，要重新部署Pages才生效。

3、不在CF中设置环境变量，而是在代码中修改，是可以的。

### 二、查看配置：

- 使用例子

```
https://a.abc.workers.dev/config?pwd=123456  # 假如123456是CF后台中，环境变量CONFIG_PASSWORD设置的值
```

### 三、查看订阅：

| 参数            | 含义                                                         |
| --------------- | ------------------------------------------------------------ |
| pwd             | (必须) 查看订阅的密码，密码是CF后台中环境变量SUB_PASSWORD设置的值 |
| target          | (可选) 默认是v2ray/trojan，trojan链接的订阅；可选 clash，clash配置的订阅 |
| page            | (可选) 页码，默认为1，显示哪一页的v2ray或clash订阅内容？超出页码显示"Not found" |
| port            | (可选) 修改trojan的port值                                    |
| host            | (可选) 修改trojan的sni和host的值，几乎不用                   |
| maxNode/maxnode | (可选) 修改每页最多写多少个节点，脚本会计算每页的节点数(平均数)，trojan链接默认为1000，可选1-5000，clash默认为300，可选1-1000 |

#### 1、v2ray/trojan订阅，使用例子：

```
https://a.abc.workers.dev/sub?pwd=123456&target=trojan                    # 第一页的trojan节点
https://a.abc.workers.dev/sub?pwd=123456&target=trojan&page=2              # 翻页，存在其它页，每页最多1000节点
https://a.abc.workers.dev/sub?pwd=123456&target=trojan&port=2053           # 改为其它端口
https://a.abc.workers.dev/sub?pwd=123456&target=trojan&hostName=githu.com  # 修改节点信息中的sni和host值
https://a.abc.workers.dev/sub?pwd=123456&target=trojan&page=2&maxNode=200  # 跟其它参数组合
```

参数随意组合，只要参数是前面表格中的，都可以全部使用。

#### 2、Clash订阅，使用例子：

```
https://a.abc.workers.dev/sub?pwd=123456&target=clash                     # 第一页的clash配置
https://a.abc.workers.dev/sub?pwd=123456&target=clash&page=2              # 翻页，存在其它页，每页最多300节点
https://a.abc.workers.dev/sub?pwd=123456&target=clash&port=2053           # 改为其它端口
https://a.abc.workers.dev/sub?pwd=123456&target=clash&hostName=github.com  # 修改节点信息中的sni和host值
https://a.abc.workers.dev/sub?pwd=123456&target=clash&page=2&maxNode=200
```

注意：

(1) 参数随意组合，只要参数是前面表格中的，都可以全部使用。

(2) 使用 workers.dev （trojan-ws）生成的 clash 配置文件不能使用，必须 `trojan-ws-tls`的才能使用。

(3) 生成的 clash 节点，PROXYIP 因某个原因丢失，一些网站（比如：ChatGPT、Cloudflare）无法打开，目前还不知道是什么原因导致的。

### 四、（可选）巧用GitHub的私有仓库，隐藏您的反代IP、域名

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

##### 4.3 优选的反代IP、域名文件的格式如下

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
注意：现在不支持在文件中添加对应的端口。

### 五、（可选）通过path指定PROXYIP

在v2rayN中，修改path的值，指定proxyip值。

<img src="images\path设置proxyip.png" />

域名：

```
/proxyip=speed.cloudflare.com
```

IPv4地址：

```
/proxyip=192.168.1.1
```

IPv6域名：

```
/proxyip=[fe80::c789:ece7:5079:3406]
```

注意：以上的PROXYIP，仅用于举例。

### 六、温馨提示

路径`src/worker.js`中的代码为开发中写的代码，大部代码根据[@ca110us](https://github.com/ca110us/epeius/blob/main/src/worker.js)修改而来，如果不是开发者，使用`_wokers.js`的代码，简单修改一下前面提到的环境变量，部署到cloudflare wokers或pages就可以使用。

### 七、免责声明

该项目仅供学习/研究目的，用户对法律合规和道德行为负责，作者对任何滥用行为概不负责。
