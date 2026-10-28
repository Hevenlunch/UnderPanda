import assert from "node:assert/strict";
import test from "node:test";
import { safeSelector, safeStyleValue, visualStylesCss, STYLE_TARGETS } from "../src/visualSettings.ts";
test("all catalog selectors are scoped and valid",()=>{
 for(const t of STYLE_TARGETS) assert.equal(safeSelector(t.selector),true,t.label);
});
test("empty settings preserve the original stylesheet",()=>{
 assert.equal(visualStylesCss().includes("!important"),false);
});
test("device overrides stay inside separate media queries",()=>{
 const selector=STYLE_TARGETS[0].selector;
 const css=visualStylesCss({desktop:{[selector]:{label:"评分标签",values:{fontSize:"20px"}}},mobile:{[selector]:{label:"评分标签",values:{fontSize:"12px"}}}});
 assert.match(css,/@media \(min-width:901px\)/);
 assert.match(css,/@media \(max-width:900px\)/);
 assert.match(css,/font-size:20px!important/);
 assert.match(css,/font-size:12px!important/);
});
test("unknown properties and external or injected CSS are rejected",()=>{
 for(const s of ["body", ".site .dev-editor", ".site p{}body", ".site p,body"])assert.equal(safeSelector(s),false);
 for(const [k,v] of [["fontSize","16px;display:none"],["backgroundImage","url(https://example.com)"],["color","red</style>"],["lineHeight","NaN"],["fontSize","500px"]])assert.equal(safeStyleValue(k,v),false);
 const css=visualStylesCss({desktop:{"body":{label:"x",values:{color:"#ffffff"}}}});
 assert.equal(css.includes("#ffffff"),false);
});
test("supported values keep units and bounds",()=>{
 for(const [k,v] of [["fontSize","20px"],["lineHeight","1.65"],["letterSpacing","-1px"],["textAlign","center"],["fontFamily","serif"],["color","#3f8290"]])assert.equal(safeStyleValue(k,v),true);
});
