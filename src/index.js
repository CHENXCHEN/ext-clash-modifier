import { Base64 } from 'js-base64'
import yaml from 'js-yaml'
import './template.js'
import template from './template.js'
import { KeyMergeStrategies, parse } from 'js-ini'

async function fetchText(url, getResp) {
  let resp = await fetch(url, {
    method: 'GET',
    headers: {
      // 如果没有 ua，对于某些产商，不会返回纯文本的 clash yaml 配置，而是会返回加密内容
      'User-Agent': 'Clash',
    }
  });
  if (getResp !== null && getResp !== undefined) {
    getResp(resp);
  }
  return await resp.text();
}

function getProxyNames(proxyNames, rules) {
  let validProxyName = [];
  rules.forEach(vv => {
    if (vv.startsWith('[]')) {
      validProxyName.push(vv.substring(2));
    } else {
      validProxyName.push(...proxyNames.filter(name => name.match(vv) != null));
    }
  });
  return validProxyName;
}

function templateFormat(str, vars) {
  [...str.matchAll("\\${([^}]*)}")].forEach((vv) => {
    if (vv.length >= 2) {
      str = str.replaceAll(vv[0], vars[vv[1]]);
    }
  });
  return str;
}

export default {
  async fetch(request, env) {
    let { pathname, searchParams } = new URL(request.url);

    if (!pathname.startsWith("/m/")) {
      return new Response(`error: invalid parameter`, {
        headers: {
          "content-type": "text/plain",
        },
      });
    }
    // get customer config
    let customUrl = searchParams.get('custom');
    let customObj = null;
    // if custom config is not null
    if (customUrl !== null && customUrl !== undefined) {
      customUrl = Base64.decode(customUrl);
      let ts = (new Date()).valueOf();
      if (customUrl.indexOf('?') > 0) customUrl = `${customUrl}&ts=${ts}`
      else customUrl = `${customUrl}?ts=${ts}`
      let customIni = await fetchText(customUrl);
      try {
        customObj = parse(customIni, { keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY });
      } catch (e) {
        console.error(`failed to parse custom config: ${customUrl}`);
      }
    }
    if (customObj === null || customObj === undefined) {
      customObj = parse(template.defaultIniConfig, { keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY });
    }
    // get addition config
    let additionUrl = searchParams.get("add");
    let addObj = null;
    if (additionUrl !== null && additionUrl !== undefined) {
      additionUrl = Base64.decode(additionUrl);
      let addIni = await fetchText(additionUrl);
      addObj = parse(addIni, { keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY });
      // add ruleset and custom to front of custom config
      if (addObj && addObj['custom']) {
        if (addObj['custom']['ruleset']) {
          customObj['custom']['ruleset'].unshift(...addObj['custom']['ruleset']);
        }
        if (addObj['custom']['custom_proxy_group']) {
          customObj['custom']['custom_proxy_group'].unshift(...addObj['custom']['custom_proxy_group']);
        }
      }
    }

    // get raw config file
    let configUrl = Base64.decode(pathname.slice(3));
    let resp = null;
    let rawConfig = await fetchText(configUrl, (_resp) => resp = _resp);
    let respHeaders = {};
    resp.headers.forEach((vv, kk) => respHeaders[kk] = vv);
    respHeaders['content-type'] = 'text/plain;charset=utf-8';
    let removeHeaders = ['content-disposition', 'content-encoding']
    removeHeaders.forEach((kk) => delete respHeaders[kk]);
    let configObj = yaml.load(rawConfig);

    // remove
    template.remove.forEach((key) => {
      if (key in configObj) {
        delete configObj[key];
      }
    });

    // parse and get all proxy name
    let proxyNames = [];
    configObj["proxies"].forEach((proxyElem) => {
      proxyNames.push(proxyElem["name"]);
    });

    let vars = {
      'provider_proxy': env.PROVIDER_PROXY,
      'clash_rule': 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/',
    }
    if (!vars['provider_proxy']) {
      vars['provider_proxy'] = 'https://ghproxy.org/';
    }
    if (configObj['var']) {
      Object.assign(vars, configObj['var']);
    }
    if (customObj && customObj['var']) {
      Object.assign(vars, customObj['var']);
    }
    if (addObj && addObj['var']) {
      Object.assign(vars, addObj['var']);
    }
    // parse and get rule providers and rules
    let ruleProviders = {}, rules = [];
    customObj["custom"]["ruleset"].forEach((rule, idx) => {
      let split = rule.split(',')
      if (split.length >= 2) {
        let groupName = split[0];
        let clashMatch = split[1].match("clash-((classical)|(ipcidr)|(domain)):")
        if (clashMatch && clashMatch.length >= 2) {
          let behavior = clashMatch[1];
          let provideInterval = Number(split[2]) ? Number(split[2]) : 86400;
          let provide = split[1].substring(split[1].indexOf(':') + 1);
          let provideUrl = templateFormat(provide, vars);
          let match = provideUrl.match(/([^/]*)\.[^.]*$/)
          let provideName = provideUrl;
          if (match.length >= 2) {
            provideName = match[1];
          } else if (match.length >= 1) {
            provideName = match[0];
          }
          ruleProviders[provideName] = {
            type: 'http', behavior, url: provideUrl, path: `./ruleset/${provideName}`, interval: provideInterval,
          }
          rules.push(`RULE-SET,${provideName},${groupName}`);
        } else if (split[1] === '[]GEOIP') {
          let target = split[2];
          if (target !== undefined && target != null) {
            rules.push(`GEOIP,${target},${groupName}`)
          }
        } else if (split[1] === '[]FINAL') {
          rules.push(`MATCH,${groupName}`)
        }
      }
    });

    let proxyGroup = [];
    customObj['custom']['custom_proxy_group'].forEach((vv, idx) => {
      let params = vv.split('`');
      let groupName = params[0], tp = params[1];
      if (params[1] === 'url-test') {
        let regex = params[2],
          urlTest = String(params[3]) ? String(params[3]) : 'http://www.google.com/generate_204',
          interval = Number(params[4]) ? Number(params[4]) : 300,
          timeout = Number(params[5]) ? Number(params[5]) : 5000,
          tolerance = Number(params[6]) ? Number(params[5]) : 50;
        let validProxyNames = getProxyNames(proxyNames, [regex]);
        proxyGroup.push({
          name: groupName, type: 'url-test', url: urlTest, interval: interval, timeout: timeout, tolerance: tolerance, proxies: validProxyNames,
        });
      } else if (params[1] === 'select') {
        let validProxyNames = getProxyNames(proxyNames, params.slice(2));
        proxyGroup.push({
          name: groupName, type: 'select', proxies: validProxyNames,
        });
      }
    });

    configObj['proxy-groups'] = proxyGroup;
    configObj['rules'] = rules;
    configObj['rule-providers'] = ruleProviders;

    let configStr = yaml.dump(configObj);
    return new Response(configStr, {
      headers: respHeaders,
    });
  },
};
