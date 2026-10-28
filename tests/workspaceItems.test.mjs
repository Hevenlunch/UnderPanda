import test from "node:test";
import assert from "node:assert/strict";
import {filterWorkspaceItems,reorderWorkspaceItems} from "../src/workspaceItems.ts";
const items=[
 {id:"a",title:"海边黄昏",image:"a.jpg",subtitle:"自然",category:"自然",search:"海风 青岛"},
 {id:"b",title:"蒸汽朋克船",image:"b.jpg",subtitle:"日常",category:"日常",search:"科幻 日照"},
 {id:"c",title:"Night",image:"c.jpg",subtitle:"城市",category:"城市",search:"上海"},
];
test("search includes titles, category labels and descriptions",()=>{
 assert.deepEqual(filterWorkspaceItems(items,"青岛 海风","").map(x=>x.id),["a"]);
 assert.deepEqual(filterWorkspaceItems(items,"night","").map(x=>x.id),["c"]);
 assert.deepEqual(filterWorkspaceItems(items,"科幻","日常").map(x=>x.id),["b"]);
 assert.equal(filterWorkspaceItems(items,"海边","城市").length,0);
});
test("empty search restores all items in canonical order",()=>{
 assert.deepEqual(filterWorkspaceItems(items,"  ","").map(x=>x.id),["a","b","c"]);
});
test("moving an item uses stable IDs and leaves data intact",()=>{
 assert.deepEqual(reorderWorkspaceItems(items,"a","c").map(x=>x.id),["b","c","a"]);
 assert.deepEqual(items.map(x=>x.id),["a","b","c"]);
 assert.equal(reorderWorkspaceItems(items,"c","a")[0],items[2]);
});
test("photo editor newest-first order converts safely back to public order",()=>{
 const publicOrder=[...items];
 const edited=reorderWorkspaceItems([...publicOrder].reverse(),"c","a").reverse();
 assert.deepEqual(edited.map(x=>x.id),["c","a","b"]);
 assert.deepEqual(publicOrder.map(x=>x.id),["a","b","c"]);
});
test("invalid or identical IDs do not reorder anything",()=>{
 assert.equal(reorderWorkspaceItems(items,"missing","a"),items);
 assert.equal(reorderWorkspaceItems(items,"a","a"),items);
 assert.deepEqual(reorderWorkspaceItems([],"a","b"),[]);
});
