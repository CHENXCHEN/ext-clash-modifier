// 指定需要在原有配置文件上删除的字段
const remove = ["proxy-groups", "rules", "rule-providers"];

// 指定需要需要追加的 YAML 配置，注意缩进
// 在数组中，使用 `_PROXY_NAME` 指代所有的 Proxy Name
// 在 Rule Provider 中的 URL 中，使用 `_PROVIDER_PROXY|` 指代规则文件代理 URL
const append = `
proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      - 🔧 手动切换
      - DIRECT
  - name: 🔧 手动切换
    type: select
    proxies: [_PROXY_NAME]
  - name: ♻️ 自动选择
    type: url-test
    url: https://www.google.com
    interval: 300
    tolerance: 50
    proxies: [_PROXY_NAME]
  - name: 🛑 广告拦截
    type: select
    proxies:
      - REJECT
      - 🚀 节点选择
      - 🔧 手动切换
      - ♻️ 自动选择
      - DIRECT
  - name: 🎯 全球直连
    type: select
    proxies:
      - DIRECT
      - 🚀 节点选择
      - 🔧 手动切换
      - ♻️ 自动选择
      - REJECT
  - name: 🐟 漏网之鱼
    type: select
    proxies:
      - DIRECT
      - 🚀 节点选择
      - 🔧 手动切换
      - ♻️ 自动选择

rules:
  - RULE-SET,applications,🎯 全球直连
  - DOMAIN,clash.razord.top,🎯 全球直连
  - DOMAIN,yacd.haishan.me,🎯 全球直连
  - RULE-SET,private,🎯 全球直连
  - RULE-SET,reject,🛑 广告拦截
  - RULE-SET,icloud,🎯 全球直连
  - RULE-SET,apple,🎯 全球直连
  - RULE-SET,google,🎯 全球直连
  - RULE-SET,tld-not-cn,🚀 节点选择
  - RULE-SET,gfw,🚀 节点选择
  - RULE-SET,greatfire,🚀 节点选择
  - RULE-SET,telegramcidr,🚀 节点选择
  - RULE-SET,lancidr,🎯 全球直连
  - RULE-SET,cncidr,🎯 全球直连
  - GEOIP,,🎯 全球直连
  - GEOIP,CN,🎯 全球直连
  - RULE-SET,direct,🎯 全球直连
  - RULE-SET,proxy,🚀 节点选择
  - MATCH,🐟 漏网之鱼

rule-providers:
  reject:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|reject.txt
    path: ./ruleset/reject.yaml
    interval: 86400
  icloud:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|icloud.txt
    path: ./ruleset/icloud.yaml
    interval: 86400
  apple:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|apple.txt
    path: ./ruleset/apple.yaml
    interval: 86400
  google:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|google.txt
    path: ./ruleset/google.yaml
    interval: 86400
  proxy:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|proxy.txt
    path: ./ruleset/proxy.yaml
    interval: 86400
  direct:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|direct.txt
    path: ./ruleset/direct.yaml
    interval: 86400
  private:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|private.txt
    path: ./ruleset/private.yaml
    interval: 86400
  gfw:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|gfw.txt
    path: ./ruleset/gfw.yaml
    interval: 86400
  greatfire:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|greatfire.txt
    path: ./ruleset/greatfire.yaml
    interval: 86400
  tld-not-cn:
    type: http
    behavior: domain
    url: _PROVIDER_PROXY|tld-not-cn.txt
    path: ./ruleset/tld-not-cn.yaml
    interval: 86400
  telegramcidr:
    type: http
    behavior: ipcidr
    url: _PROVIDER_PROXY|telegramcidr.txt
    path: ./ruleset/telegramcidr.yaml
    interval: 86400
  cncidr:
    type: http
    behavior: ipcidr
    url: _PROVIDER_PROXY|cncidr.txt
    path: ./ruleset/cncidr.yaml
    interval: 86400
  lancidr:
    type: http
    behavior: ipcidr
    url: _PROVIDER_PROXY|lancidr.txt
    path: ./ruleset/lancidr.yaml
    interval: 86400
  applications:
    type: http
    behavior: classical
    url: _PROVIDER_PROXY|applications.txt
    path: ./ruleset/applications.yaml
    interval: 86400

`;

export default { remove, append };
