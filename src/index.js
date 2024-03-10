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

async function parseCustom(url) {
  let customUrl = url;
  let customObj = null;
  // if custom config is not null
  if (customUrl !== null && customUrl !== undefined) {
    let ts = (new Date()).valueOf();
    if (customUrl.indexOf('?') > 0) customUrl = `${customUrl}&ts=${ts}`
    else customUrl = `${customUrl}?ts=${ts}`
    let customIni = await fetchText(customUrl);
    try {
      customObj = parse(customIni,
        { keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY });
    } catch (e) {
      console.error(`failed to parse custom config: ${customUrl}`);
    }
  }
  if (customObj === null || customObj === undefined) {
    customObj = parse(template.defaultIniConfig, { keyMergeStrategy: KeyMergeStrategies.JOIN_TO_ARRAY });
  }
  return customObj;
}

async function parseSub(url) {
  let resp = null;
  let rawConfig = await fetchText(url, (_resp) => resp = _resp);
  return [yaml.load(rawConfig), resp];
}

function parseRules(customObj, proxyNames, vars) {
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

  return {
    'proxy-groups': proxyGroup,
    'rules': rules,
    'rule-providers': ruleProviders,
  };
}

function parseVars(customObj, env) {
  let vars = {
    'provider_proxy': env.PROVIDER_PROXY,
    'clash_rule': 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/',
  }
  if (!vars['provider_proxy']) {
    vars['provider_proxy'] = 'https://ghproxy.org/';
  }
  if (customObj && customObj['var']) {
    Object.assign(vars, customObj['var']);
  }
  return vars;
}

async function parseAll(subUrls, customerUrl, getResp, env) {
  // parse custom url
  let customObj = await parseCustom(customerUrl)
  let vars = parseVars(customObj, env);
  // get sub urls
  if (customObj && customObj.sub && customObj.sub.url) {
    let _url = customObj.sub.url;
    if (_url instanceof Array) subUrls = _url;
    else if (_url instanceof String) subUrls = [_url];
  }

  let proxies = {}, proxyNames = [], tot = 0;
  let subUrlPromise = subUrls.map(url => parseSub(url))
  let subObjs = await Promise.all(subUrlPromise)
  // parse subscribe urls
  let allConfigObj = {}, excludeSet = new Set(["proxy-groups", "rules", "rule-providers", "proxies"]);
  subObjs.forEach(ret => {
    let configObj = ret[0];
    getResp(ret[1]);
    Object.keys(configObj).forEach(kk => {
      if (!excludeSet.has(kk)) {
        allConfigObj[kk] = configObj[kk];
      }
    })
    // collect all proxies, and rename it
    configObj['proxies'].forEach(proxy => {
      let proxyName = `${proxy.name} | ${tot}`;
      ++tot;
      proxy.name = proxyName;
      proxies[proxyName] = proxy;
      proxyNames.push(proxyName);
    })
  })
  allConfigObj['proxies'] = Object.values(proxies);

  let rules = parseRules(customObj, proxyNames, vars)
  Object.assign(allConfigObj, rules);
  return allConfigObj;
}

export default {
  async fetch(request, env) {
    let { pathname, searchParams } = new URL(request.url);

    let configUrl = null;
    let subUrls = [];
    let customUrl = null;

    if (pathname.startsWith("/m/")) {
      configUrl = Base64.decode(pathname.slice(3));
      subUrls.push(configUrl);
      try {
        customUrl = Base64.decode(searchParams.get('custom'))
      } catch (e) {

      }
    } else if (pathname.startsWith("/p/")) {
      customUrl = Base64.decode(pathname.slice(3));
    } else {
      return new Response(`error: invalid parameter`, {
        headers: {
          "content-type": "text/plain",
        },
      });
    }

    let resp = null;
    let configObj = await parseAll(subUrls, customUrl, (_resp) => resp = resp == null ? _resp : resp, env);

    let respHeaders = {};
    resp.headers.forEach((vv, kk) => respHeaders[kk] = vv);
    respHeaders['content-type'] = 'text/plain;charset=utf-8';
    let removeHeaders = ['content-disposition', 'content-encoding']
    removeHeaders.forEach((kk) => delete respHeaders[kk]);

    let configStr = yaml.dump(configObj);
    return new Response(configStr, {
      headers: respHeaders,
    });
  },
};
