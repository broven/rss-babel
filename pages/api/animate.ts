/**
 * @author metajs
 */
import { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';
import convert from 'xml-js';

export enum IResolution {
  rUHD = 'UHD',
  r1080p = '1080p',
  r720p = '720p',
  rUnknown = 'unknown'
}
export class AnimateTitleMetaParser {
  private rawTitle: string;
  constructor(title: string) {
    this.rawTitle = title;
  }
  get resolution(): IResolution {
    const t = this.rawTitle;
    switch(true) {
      case t.indexOf('1080p') !== -1:
      case t.indexOf('1080P') !== -1:
      case t.indexOf('1920X1080') !== -1:
        return IResolution.r1080p;
      case t.indexOf('720p') !== -1:
      case t.indexOf('1280X720') !== -1:
        return IResolution.r720p;
      default:
        return IResolution.rUnknown;
    }
  }
  get isSeasonPack(): boolean {
    const title = this.rawTitle
    switch(true) {
        case title.indexOf('【合集】') !== -1:
            return true;
        default:
            return false;
    }
  }
  get isTraditionalChinese(): boolean {
    const text = this.rawTitle;
    switch(true) {
        case text.indexOf('BIG5') !== -1:
        case text.indexOf('CHT') !== -1:
            return true;
        default:
            return false;
    }
  }
  get season(): number {
    return -1;
  }
  get episode(): number {
    const splitterArr = [
      /】/, /【/, /\[/, /\]/, /\s/
    ];
    const regArr = [
      /~~~(\d{1,})~~~/
    ];
    let title = this.rawTitle;
    for (const splitter of splitterArr) {
      const _reg = new RegExp(splitter, 'g');
      title = title.replace(_reg, '~~~');
    }
    console.log(title);
    for (const reg of regArr) {
      const match = reg.exec(this.rawTitle);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return -1;
  }
}
export const animateFilter = (content: string) => {
  const parsedFeed:any = convert.xml2js(content, { compact: true});
  parsedFeed.rss.channel.item = parsedFeed.rss.channel.item.map((item: any) => {
    const title = item.title._text;
    const metaParser = new AnimateTitleMetaParser(title);
    if (metaParser.isSeasonPack) return null;
    if (metaParser.isTraditionalChinese) return null;
   return item;
  }).filter((i: any) => i !== null);
  return convert.js2xml(parsedFeed, {compact: true, spaces: 4});
}

export default async function AnimateTransformer(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query as { url: string };
  const feedContent = await axios.get(url);
  res.status(200).end(animateFilter(feedContent.data));
}