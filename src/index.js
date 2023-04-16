import { Base64 } from 'js-base64'
import yaml from 'js-yaml'
import './template.js'
import template from './template.js'

async function fetchText(url, getResp) {
  let resp = await fetch(url, {
    method: 'GET',
    headers: {
      // 如果没有 ua，对于某些产商，不会返回纯文本的 clash yaml 配置，而是会返回加密内容
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.43',
    }
  });
  if (getResp !== null && getResp !== undefined) {
    getResp(resp);
  }
  return await resp.text();
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
    let customUrl = searchParams.get('custom');
    let customObj = null;
    if (customUrl !== null && customUrl !== undefined) {
      customUrl = Base64.decode(customUrl);
      let customConfig = await fetchText(customUrl);
      customObj = yaml.load(customConfig);
    }

    let configUrl = Base64.decode(pathname.slice(3));
    let resp = null;
    let rawConfig = await fetchText(configUrl, (_resp) => resp = _resp);
    let configObj = yaml.load(rawConfig);

    // remove
    template.remove.forEach((key) => {
      if (key in configObj) {
        delete configObj[key];
      }
    });

    // append
    let appendObj = yaml.load(template.append);
    configObj = Object.assign(configObj, appendObj);

    // replace proxy names
    let proxyName = [];
    configObj["proxies"].forEach((proxyElem) => {
      proxyName.push(proxyElem["name"]);
    });

    configObj["proxy-groups"].forEach((_, index) => {
      let groupElem = configObj["proxy-groups"][index];

      let i = groupElem["proxies"].indexOf("_PROXY_NAME");
      if (i !== -1) {
        groupElem["proxies"].splice(i, 1, ...proxyName);
      }
    });

    let PROVIDER_PROXY = env.PROVIDER_PROXY;
    let clashRuleUrl = 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/';
    // replace rule provider proxy
    Object.keys(configObj["rule-providers"]).forEach(index => {
      let providerElem = configObj["rule-providers"][index];
      let providerProxy = typeof PROVIDER_PROXY === 'string' && PROVIDER_PROXY.trim().length > 0 ? PROVIDER_PROXY: new URL(request.url).origin + '/p/'
      let split = providerElem['url'].split('_PROVIDER_PROXY|')
      if (split.length === 2) {
        if (!split[1].startsWith("http")) {
          providerElem['url'] = PROVIDER_PROXY + clashRuleUrl + split[1];
        } else {
          providerElem['url'] = PROVIDER_PROXY + split[1];
        }
      }
    });

    if (customObj !== null && 'rules' in customObj) {
      configObj['rules'].unshift(...customObj['rules']);
    }

    let configStr = yaml.dump(configObj);
    return new Response(configStr, {
      headers: resp.headers,
    });
  },
};
