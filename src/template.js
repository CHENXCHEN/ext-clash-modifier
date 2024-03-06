// 指定需要在原有配置文件上删除的字段
const remove = ["proxy-groups", "rules", "rule-providers"];

// 指定需要需要追加的 YAML 配置，注意缩进
// 在 Rule Provider 中的 URL 中，使用 `\${provider_proxy}\${clash_rule}` 变量替换内容
const defaultIniConfig = `
[custom]
ruleset=🎯 全球直连,clash-classical:\${provider_proxy}\${clash_rule}applications.txt
ruleset=🎯 全球直连,clash-domain:\${provider_proxy}\${clash_rule}private.txt
ruleset=🛑 广告拦截,clash-domain:\${provider_proxy}\${clash_rule}reject.txt
ruleset=🎯 全球直连,clash-domain:\${provider_proxy}\${clash_rule}icloud.txt
ruleset=🎯 全球直连,clash-domain:\${provider_proxy}\${clash_rule}apple.txt
ruleset=🎯 全球直连,clash-domain:\${provider_proxy}\${clash_rule}google.txt
ruleset=🚀 节点选择,clash-domain:\${provider_proxy}\${clash_rule}tld-not-cn.txt
ruleset=🚀 节点选择,clash-domain:\${provider_proxy}\${clash_rule}gfw.txt
ruleset=🚀 节点选择,clash-domain:\${provider_proxy}\${clash_rule}greatfire.txt
ruleset=🚀 节点选择,clash-ipcidr:\${provider_proxy}\${clash_rule}telegramcidr.txt
ruleset=🎯 全球直连,clash-ipcidr:\${provider_proxy}\${clash_rule}lancidr.txt
ruleset=🎯 全球直连,clash-ipcidr:\${provider_proxy}\${clash_rule}cncidr.txt
ruleset=🚀 节点选择,clash-domain:\${provider_proxy}\${clash_rule}proxy.txt
ruleset=🎯 全球直连,clash-domain:\${provider_proxy}\${clash_rule}direct.txt
ruleset=🎯 全球直连,[]GEOIP,LAN
ruleset=🎯 全球直连,[]GEOIP,CN
ruleset=🐟 漏网之鱼,[]FINAL

custom_proxy_group=🚀 节点选择\`select\`[]♻️ 自动选择\`[]🔧 手动切换\`[]DIRECT
custom_proxy_group=♻️ 自动选择\`url-test\`.*\`http://www.google.com/generate_204\`300,5000,50
custom_proxy_group=🔧 手动切换\`select\`.*
custom_proxy_group=🎯 全球直连\`select\`[]DIRECT\`[]🚀 节点选择\`[]♻️ 自动选择\`[]🔧 手动切换\`[]REJECT
custom_proxy_group=🛑 广告拦截\`select\`[]REJECT\`[]🚀 节点选择\`[]♻️ 自动选择\`[]🔧 手动切换\`[]DIRECT
custom_proxy_group=🐟 漏网之鱼\`select\`[]DIRECT\`[]🚀 节点选择\`[]♻️ 自动选择\`[]🔧 手动切换
`

export default { remove, defaultIniConfig };
