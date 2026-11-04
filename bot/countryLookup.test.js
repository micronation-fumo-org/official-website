import assert from "node:assert/strict";
import test from "node:test";
import {
  createCountryEmbedData,
  findCountryMatches,
  formatCountryMatches,
  getPublicRepresentativeNames,
  normalizeCountryName,
} from "./countryLookup.js";

const states = {
  memberStates: [
    { fullName: "共和國範例", shortName: "範例國", abbreviation: "EX", governmentType: "共和制", headOfState: "林主席", primeMinister: "陳總理", status: "member" },
    { fullName: "共和國阿爾法", shortName: "阿爾法", abbreviation: "AL", governmentType: "君主制", status: "member" },
  ],
  observerStates: [
    { fullName: "觀察邦範例", shortName: "觀察邦", abbreviation: "OB", governmentType: "議會制", status: "observer" },
    { fullName: "共和國範例", shortName: "範例國", abbreviation: "EX", governmentType: "共和制", status: "observer" },
  ],
  allStates: [
    { fullName: "共和國範例", shortName: "範例國", abbreviation: "EX", governmentType: "共和制", headOfState: "林主席", primeMinister: "陳總理", status: "member" },
    { fullName: "共和國阿爾法", shortName: "阿爾法", abbreviation: "AL", governmentType: "君主制", status: "member" },
    { fullName: "觀察邦範例", shortName: "觀察邦", abbreviation: "OB", governmentType: "議會制", status: "observer" },
    { fullName: "共和國範例", shortName: "範例國", abbreviation: "EX", governmentType: "共和制", status: "observer" },
  ],
};

test("normalizes full-width spaces and Unicode compatibility forms", () => {
  assert.equal(normalizeCountryName("　範例國\u00a0"), "範例國");
});

test("finds countries by exact full name, short name, or abbreviation", () => {
  assert.equal(findCountryMatches(states, "共和國阿爾法")[0].status, "member");
  assert.equal(findCountryMatches(states, "阿爾法")[0].fullName, "共和國阿爾法");
  assert.equal(findCountryMatches(states, "al")[0].fullName, "共和國阿爾法");
});

test("prefers exact matches and resolves duplicate state status consistently", () => {
  const matches = findCountryMatches(states, "共和國範例");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, "observer");
});

test("returns bounded partial matches and no results for an empty or unknown query", () => {
  assert.deepEqual(findCountryMatches(states, "共和國").map(state => state.fullName), ["共和國範例", "共和國阿爾法"]);
  assert.deepEqual(findCountryMatches(states, ""), []);
  assert.deepEqual(findCountryMatches(states, "不存在的國家"), []);
});

test("formats ambiguous matches with country status", () => {
  assert.equal(formatCountryMatches(findCountryMatches(states, "共和國")), "・共和國範例（觀察國）\n・共和國阿爾法（成員國）");
});

test("returns only public representative names and never returns Discord IDs", () => {
  const voters = [
    { countryName: "共和國範例", reps: [
      { name: "王代表", id: "123456789012345678" },
      { name: "王代表", id: "223456789012345678" },
      { name: "123456789012345678", id: "323456789012345678" },
      { name: "陳代表 <@423456789012345678>", id: "423456789012345678" },
    ] },
    { countryName: "共和國阿爾法", reps: [{ name: "不應出現", id: "523456789012345678" }] },
  ];
  const names = getPublicRepresentativeNames(voters, "共和國範例");
  assert.deepEqual(names, ["王代表", "陳代表"]);
  assert.equal(JSON.stringify(names).includes("123456789012345678"), false);
  assert.equal(JSON.stringify(names).includes("423456789012345678"), false);
});

test("embeds use the shared official directory and omit Discord IDs", () => {
  const state = findCountryMatches(states, "共和國阿爾法")[0];
  const embed = createCountryEmbedData(state, ["王代表", "123456789012345678"], "https://www.micronationfumo.org");
  assert.equal(embed.url, "https://www.micronationfumo.org/members");
  assert.equal(embed.fields.find(field => field.name === "會員狀態").value, "成員國");
  assert.match(embed.fields.find(field => field.name === "國家連結").value, /\/members\)/);
  assert.equal(JSON.stringify(embed).includes("123456789012345678"), false);
  assert.match(embed.footer.text, /不顯示 Discord ID/);
});

test("explains when representative data is unavailable without failing country lookup", () => {
  const state = findCountryMatches(states, "共和國阿爾法")[0];
  const embed = createCountryEmbedData(state, [], "https://www.micronationfumo.org", { representativesAvailable: false });
  assert.equal(embed.fields.find(field => field.name === "代表").value, "目前無法載入代表資料，請稍後重試。");
});
