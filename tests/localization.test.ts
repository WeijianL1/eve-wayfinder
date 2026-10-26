import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {getLocale,setLocale,translate,localeTag} from '../src/i18n/index.ts';

test('localization translates dynamic messages while retaining data identifiers and Chinese originals',()=>{
 setLocale('en');assert.equal(getLocale(),'en');assert.equal(localeTag(),'en-US');
 assert.equal(translate('真实高安区域'),'Live Highsec Region');
 assert.equal(translate('12跳'),'12 jumps');
 assert.equal(translate('正在查询 3 个角色；身份信息批量解析，战损限并发并使用缓存。'),'Looking up 3 characters; identities are resolved in batches and killmail requests use caching and limited concurrency.');
 assert.equal(translate('Amber Mykoserocin'),'Amber Mykoserocin');
 const data={id:42,name:'Prexa'};assert.equal(translate(data),data);
 setLocale('zh-CN');assert.equal(translate('真实高安区域'),'真实高安区域');
});
test('English catalog covers Chinese presentation phrases in frontend and backend messages',()=>{
 setLocale('en');const missing=new Set<string>();
 const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
 for(const file of [...walk('src'),...walk('server')].filter(file=>/\.(tsx?|mjs)$/.test(file)&&!file.includes('src/i18n/'))){
  const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const check=(text:string)=>{if(/[\u3400-\u9fff]/.test(text)&&!text.includes('<!doctype')&&/[\u3400-\u9fff]/.test(translate(text)))missing.add(text);};
  function visit(node:ts.Node){if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node))check(node.text);if(ts.isTemplateExpression(node)){check(node.head.text);node.templateSpans.forEach(span=>check(span.literal.text));}ts.forEachChild(node,visit);}visit(source);
 }
 assert.deepEqual([...missing],[]);setLocale('zh-CN');
});
