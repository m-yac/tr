
const fs = require('fs');
const _ = require("./lodash.js")
const {encodeToArray, default_trlit, transliterateFromArray, transliterate} = require('./transliterate.js');

function inlineTransliterate(str, trlit) {
  return str.replace(/\{([^\}]+)\}/g, function (_full_match, gp) {
    const spl = gp.split("/");
    if (spl.length == 2) {
      return `<span class="avoidwrap"><span class="inlineHe">${spl[0]}</span> (<i>${spl[1]}</i>)</span>`;
    }
    else {
      const he = gp.replace(/([|*_]|\[[^\]]*\])/g, "").replace(/([~])/g, " ");
      const tl = transliterate(gp.replace(/[\[\]]/g, ""), trlit).replace("|", "");
      return `<span class="avoidwrap"><span class="inlineHe">${he}</span> (<i>${tl}</i>)</span>`;
    }
  })
}

// Generating HTML

function addSpansHeTl(pr, ix, he) {
  let [j, j_marker] = [0, 0];
  let in_marker = false;
  let he_html = `<span id="ix${ix}-${pr}-${j}">`;
  for (let gp of he.replace(/([*_]|\[[^\]]*\])/g, "").split(/([ ^|/~-])/g)) {
    if ([" ", "-", "/"].includes(gp)) {
      j++;
      if (in_marker) { he_html += `</span>`; in_marker = false; }
      he_html += `</span>` + gp + `<span id="ix${ix}-${pr}-${j}">`;
    }
    else if (gp === "^") {
      if (in_marker) { he_html += `</span>`; in_marker = false; }
      he_html += `<span id="marker-ix${ix}-${pr}-${j}-${j_marker}">`;
      j_marker++;
      in_marker = true;
    }
    else if (gp === "|") {
      j++;
      if (in_marker) { he_html += `</span>`; in_marker = false; }
      he_html += `</span><span id="ix${ix}-${pr}-${j}">`;
    }
    else if (gp === "~") {
      if (in_marker) { he_html += `</span>`; in_marker = false; }
      he_html += ` `;
    }
    else {
      he_html += gp;
    }
  }
  if (in_marker) { he_html += `</span>`; in_marker = false; }
  return [j, he_html + `</span>`];
}

function addSpansEn(ix, en) {
  let js = [];
  let en_html = "";
  for (let gp of en.split(/(\[[^\]]*\]\(\^*[0-9]+\))/g)) {
    if (gp[0] === "\[") {
      const [[_full_match, txt, carats, j]] = [...gp.matchAll(/\[([^\]]*)\]\((\^*)([0-9]+)\)/g)];
      en_html += `<span id="ix${ix}-en-${j}${carats}">`
      en_html += txt + `</span>`;
      js.push(`${j}${carats}`);
    }
    else {
      en_html += gp;
    }
  }
  return [js, en_html.replace(/\*[^\*]+\*/g, function(v) { return `<i>${v.slice(1,-1)}</i>`; })];
}

function getHeTlEnRowTds(pr, trlit, ix, colors) {
  const [_v, he, en, notes] = pr["text"][ix];
  const tl = transliterate(he.replace(/[\[\]]/g, ""), trlit);
  const [he_max_j, he_html] = addSpansHeTl("he", ix, he);
  const [_tl_max_j, tl_html] = addSpansHeTl("tl", ix, tl);
  const [en_js, en_html] = addSpansEn(ix, en);
  for (let j = 0; j <= he_max_j; j++) {
    colors[ix+"-"+j] = j / (he_max_j == 0 ? 1 : he_max_j);
  }
  for (const j of en_js) {
    if (!((ix+"-"+j) in colors)) {
      colors[ix+"-"+j] = 4/3;
    }
  }
  const tdHe = `    <td id="ix${ix}-hetd" class="he" dir="rtl">${he_html}</td>\n`;
  const tdTl = `    <td id="ix${ix}-tltd" class="tl">${tl_html}</td>\n`;
  const tdEn = `    <td id="ix${ix}-entd" class="en">${en_html}</td>\n`;
  return [tdHe, tdTl, tdEn, en.length == 0, colors];
}

function addRow(rowContent, ix, isEmpty_l, isEmpty_r, line_nos = true, suffix = "") {
  let content = "";
  content += `  <tr id="ix${ix}-tr${suffix}">`;
  if (line_nos) { content += `    <td id="ix${ix}-lnoL${suffix}" class="line_no${isEmpty_l ? "_empty" : ""}">/</td>\n`; }
  content += rowContent;
  if (line_nos) { content += `    <td id="ix${ix}-lnoR${suffix}" class="line_no${isEmpty_r ? "_empty" : ""}">/</td>\n`; }
  content += `  </tr>\n`;
  return content;
}

function addHeTlEnRow(pr, trlit, ix, colors, line_nos = true) {
  const [tdHe, tdTl, tdEn, isEmpty, new_colors] = getHeTlEnRowTds(pr, trlit, ix, colors);
  const content = addRow(tdHe + tdTl + tdEn, ix, isEmpty, isEmpty, line_nos);
  return [content, new_colors];
}

translations = [["תפלות", "Prayers", require("./prayers.json")],
                ["ברכות", "Blessings", require("./blessings.json")],
                ["לימים נוראים", "For the High Holidays", require("./for_the_high_holidays.json")]];
allTranslations = _.merge({}, ...translations.map((tr) => tr[2]));

// Make index.html
const index_pr = { "text": [ ["", "זִכְרוֹנָ_|ם לִ|בְרָכָה",
  "<span class=\"avoidWrap\">[May](4) [their](1) [memory](0)</span> " +
  "<span class=\"avoidWrap\">[be](4) [for](2) [a blessing](3)</span>"] ] };
const [index_row, index_colors] = addHeTlEnRow(index_pr, default_trlit, 0, {}, false);
let index = `<!DOCTYPE html><html>\n`;
index += `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n`;
index += `<title>Interactive Translations</title>\n`;
index += `<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">\n`;
index += `<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">\n`;
index += `<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">\n`;
index += `<link rel="manifest" href="site.webmanifest">\n`;
index += `<link rel="mask-icon" href="safari-pinned-tab.svg" color="#000000">\n`;
index += `<meta name="msapplication-TileColor" content="#da532c">\n`;
index += `<meta name="theme-color" content="#ffffff"></meta>\n`;
index += `<link rel="stylesheet" href="style.css" />\n`;
index += `<script type="text/javascript" src="jquery.min.js"></script>\n`;
index += `<script>var pr = ${JSON.stringify(index_pr)};</script>\n`;
index += `<script>var colors = ${JSON.stringify(index_colors)};</script>\n`;
index += `<script type="text/javascript" src="index.js"></script>\n`;
index += `<script type="text/javascript">\n`;
index += `  $(document).ready(function () {\n`;
index += `    $('td[id$="-tltd"]').addClass("hidden");\n`;
index += `    $('td[id^="maintd-en"]').each(function () {\n`;
index += `      const titleEn = this.id.split("-")[2];\n`;
index += `      const widthHe = $(\`#maintd-he-\${titleEn}\`).outerWidth(true);\n`;
index += `      const widthEn = $(\`#maintd-en-\${titleEn}\`).outerWidth(true);\n`;
index += `      const width = Math.max(widthHe, widthEn) + 20;\n`;
index += `      $(\`#maintd-he-\${titleEn}\`).attr("style", \`width: \${width}px;\`);\n`;
index += `      $(\`#maintd-en-\${titleEn}\`).attr("style", \`width: \${width}px;\`);\n`;
index += `    })\n`;
index += `  });\n`;
index += `</script>\n`;
index += `</head>\n<body>\n`;
index += `<div class="titleAndCredits">\n`;
index += `<h1>Interactive Translations</h1>\n`
index += `<div class="credits noStyle">\n`;
index += `  <p>In memory of:</p>\n`;
index += `  <p><i>Chazan</i> Ilan Mamber, who gave my family our love of Jewish music</p>\n`;
index += `  <p>Susan Amy Yacavone, my mother, whose favorite prayers are all here</p>\n`;
index += `  <table class="inheritFontSize">\n${index_row}</table>\n`;
index += `</div>\n`;
index += `</div>\n`;
index += `<div class="flexContainer">\n`;
let allLinks = [];
for (const [titleHe, titleEn, prayers] of translations) {
  index += `<div class="flexBox"><table>\n`;
  index += `  <tr>\n`;
  index += `    <td id="maintd-he-${titleEn.replace(/ /g, "")}" class="h2td" dir="rtl"><h2 class="h2He heStam">${titleHe}</h2></td>\n`;
  index += `    <td id="maintd-en-${titleEn.replace(/ /g, "")}" class="h2td"><h2 class="h2En">${titleEn}</h2></td>\n`;
  index += `  </tr>\n`;
  let links_to_add = [];
  for (const pr of Object.keys(prayers).sort()) {
    const page_name = pr.replace(" ", "_") + ".html";
    links_to_add.push(`  <a href="${page_name}" class="grey avoidwrap">${prayers[pr]["title"][1]}</a>`)
    index += `  <tr class="aHilight">\n`;
    index += `    <td class="he heStam" dir="rtl"><a href="${page_name}">${prayers[pr]["title"][0]}</a></td>\n`;
    index += `    <td><a href="${page_name}">${prayers[pr]["title"][1]}</a></td>\n`;
    index += `  </tr>\n`;
  }
  index += `</table></div>\n`;
  allLinks.push(links_to_add);
}
index += `</div>\n`;
index += `<div class="footer">\n`;
index += `  <div class="checkboxes indexCheckboxes">\n`;
index += `    <div class="checkboxContainer darkCheckboxContainer">\n`
index += `      <input id="dark-checkbox" name="dark-checkbox" type="checkbox"/>\n`
index += `      <label for="dark-checkbox">\n`;
index += `        <!-- Adapted from: https://www.veryicon.com/icons/miscellaneous/eva-icon-fill/moon-20.html -->\n`;
index += `        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`;
index += `          <path fill="currentColor" d="M524.8 938.666667h-4.266667a439.893333 439.893333 0 0 1-313.173333-134.4 446.293333 446.293333 0 0 1-11.093333-597.333334 432.213333 432.213333 0 0 1 170.666666-116.906666 42.666667 42.666667 0 0 1 45.226667 9.386666 42.666667 42.666667 0 0 1 10.24 42.666667 358.4 358.4 0 0 0 82.773333 375.893333 361.386667 361.386667 0 0 0 376.746667 82.773334 42.666667 42.666667 0 0 1 54.186667 55.04A433.493333 433.493333 0 0 1 836.266667 810.666667a438.613333 438.613333 0 0 1-311.466667 128z"/>\n`;
index += `        </svg>\n`;
index += `      </label>\n`
index += `    </div>\n`;
index += `  </div>\n`;
index += `  <a href="https://yacavone.net" class="grey">Back to my website</a>\n`
index += `</div>\n`;
index += `</body></html>`;
fs.writeFile("./index.html", index, err => {
  if (err) { console.error(err); }
});

// Make each prayer/blessing's page
for (const pr in allTranslations) {
  const page_name = pr.replace(" ", "_") + ".html";
  let trlit = default_trlit;
  if ("transliteration" in allTranslations[pr]) {
    trlit = trlit.copy().addAll(allTranslations[pr]["transliteration"]);
  }
  let colors = {};
  // Header (wait to stringify `colors`!)
  let header = `<!DOCTYPE html><html>\n`;
  header += `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n`;
  header += `<title>${allTranslations[pr]["title"][1]} | Interactive Translation</title>\n`;
  header += `<link rel="stylesheet" href="style.css" />\n`;
  header += `<script type="text/javascript" src="jquery.min.js"></script>\n`;
  header += `<script>var pr = ${JSON.stringify(allTranslations[pr])};</script>\n`;
  let content = `<script type="text/javascript" src="index.js"></script>\n`;
  if ("extra-js" in allTranslations[pr]) {
    content += `<script>\n`;
    content += `  $(document).ready(function () {\n`;
    content += allTranslations[pr]["extra-js"].map((str) => `    ${str}\n`).join("");
    content += `  });\n`
    content += `</script>\n`;
  }
  content += `</head>\n<body>\n`;
  // Title
  content += `<div class="titleAndCredits">\n`;
  content += `  <h1 id="topHeader" class="aLike">\n`;
  content += `    <span class="h1He">${allTranslations[pr]["title"][0]}</span>\n`;
  content += `    <span class="h1En">${allTranslations[pr]["title"][1]}</span>\n`;
  content += `  </h1>\n`;
  if ("text-credit" in allTranslations[pr]) {
    content += `  <div class="credits">${allTranslations[pr]["text-credit"]}</div>`;
  }
  content += `</div>\n`;
  // Location-0 choices/presets
  content += `<table class="choices">\n`;
  let i = 0;
  for (const ch in allTranslations[pr]["choices"]) {
    if (!("choices-presets-locations" in allTranslations[pr]) || allTranslations[pr]["choices-presets-locations"][ch] == 0) {
      content += `  <tr>`;
      content += `    <td class="choiceLabel">${inlineTransliterate(ch, trlit)}:</td>\n`;
      content += `    <td class="choiceSelect">\n`;
      content += `      <div id="cc${i}" class="selectContainer">\n`;
      content += `        <select id="cs${i}" title="${ch}" aria-label="${ch}"></select>\n`;
      content += `      </div>\n`;
      content += `    </td>\n`;
      content += `  </tr>\n`;
    }
    i++;
  }
  if ("presets" in allTranslations[pr] &&
      (!("choices-presets-locations" in allTranslations[pr]) || allTranslations[pr]["choices-presets-locations"]["Preset"] == 0)) {
    content += `  <tr>`;
    content += `    <td class="choiceLabel">Preset:</td>\n`;
    content += `    <td class="choiceSelect">\n`;
    content += `      <div id="ccP" class="selectContainer">\n`;
    content += `        <select id="csP" title="Preset" aria-label="Preset"></select>\n`;
    content += `      </div>\n`;
    content += `    </td>\n`;
    content += `  </tr>\n`;
  }
  content += `</table>\n`;
  // View controls
  content += `<div class="checkboxes">\n`;
  content += `  <div class="checkboxContainer darkCheckboxContainer">\n`
  content += `    <input id="dark-checkbox" name="dark-checkbox" type="checkbox"/>\n`
  content += `    <label for="dark-checkbox">\n`;
  content += `      <!-- Adapted from: https://www.veryicon.com/icons/miscellaneous/eva-icon-fill/moon-20.html -->\n`;
  content += `      <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`;
  content += `        <path fill="currentColor" d="M524.8 938.666667h-4.266667a439.893333 439.893333 0 0 1-313.173333-134.4 446.293333 446.293333 0 0 1-11.093333-597.333334 432.213333 432.213333 0 0 1 170.666666-116.906666 42.666667 42.666667 0 0 1 45.226667 9.386666 42.666667 42.666667 0 0 1 10.24 42.666667 358.4 358.4 0 0 0 82.773333 375.893333 361.386667 361.386667 0 0 0 376.746667 82.773334 42.666667 42.666667 0 0 1 54.186667 55.04A433.493333 433.493333 0 0 1 836.266667 810.666667a438.613333 438.613333 0 0 1-311.466667 128z"/>\n`;
  content += `      </svg>\n`;
  content += `    </label>\n`
  content += `  </div>\n`;
  content += `  <div class="checkboxContainer">\n`
  content += `    <input id="he-checkbox" name="he-checkbox" type="checkbox" checked/>\n`
  content += `    <label for="he-checkbox">עב</label>\n`
  content += `    <input id="tl-checkbox" name="tl-checkbox" type="checkbox" checked/>\n`
  content += `    <label for="tl-checkbox"><i>Trl</i></label>\n`
  content += `    <input id="en-checkbox" name="en-checkbox" type="checkbox" checked/>\n`
  content += `    <label for="en-checkbox">En</label>\n`
  content += `  </div>\n`;
  content += `  <div class="checkboxContainer colorCheckboxContainer">\n`
  content += `    <input id="color-checkbox" name="color-checkbox" type="checkbox"/>\n`
  content += `    <label for="color-checkbox">\n`
  content += `      <!-- Adapted from: https://www.svgrepo.com/svg/155843/paint-bucket-with-a-paint-drop -->\n`;
  content += `      <svg class="colorSVG" viewBox="0 0 387.2 387.2" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`;
  content += `        <defs>\n`;
  content += `          <path id="p1" d="M321.342,231.438c1.247,18.164,16.82,29.531,34.985,28.283c18.165-1.246,32.041-14.633,30.795-32.798 s-36.318-63.804-36.542-50.949C350.271,193.849,320.095,213.273,321.342,231.438z"/>\n`;
  content += `          <path id="p2" d="M123.587,31.759c-4.533-2.444-10.243-0.734-12.688,3.799L1.115,239.19c-2.444,4.534-0.734,10.243,3.799,12.688 l192.092,103.562c4.534,2.444,10.243,0.734,12.688-3.799l96.69-173.578c2.443-4.533,36.644-26.883,36.644-26.883 c4.143-3.061,3.82-7.565-0.712-10.01L123.587,31.759z"/>\n`;
  content += `          <clipPath id="c1"><use xlink:href="#p1"/></clipPath>\n`;
  content += `          <clipPath id="c2"><use xlink:href="#p2"/></clipPath>\n`;
  content += `        </defs>\n`;
  content += `        <use xlink:href="#p1" stroke-width="75" stroke="currentColor" clip-path="url(#c1)"/>\n`;
  content += `        <use xlink:href="#p2" stroke-width="75" stroke="currentColor" clip-path="url(#c2)"/>\n`;
  content += `      </svg>\n`;
  content += `    </label>\n`
  content += `  </div>\n`;
  content += `</div>\n`;
  // Text
  content += `<table class="text">\n`;
  if ([undefined, "columns"].includes(allTranslations[pr]["format"])) {
    for (let ix = 0; ix < allTranslations[pr]["text"].length; ix++) {
      if (allTranslations[pr]["text"][ix].length === 2) {
        const tdHe = `    <td id="ix${ix}-hetd" class="he" dir="rtl"><span class="invisible">ם</span></td>\n`;
        const tdEn = `    <td id="ix${ix}-enOnly" class="enOnly">${allTranslations[pr]["text"][ix][1]}</td>\n`;
        content += addRow(tdHe + tdEn, ix, false, false);
      }
      else {
        const [to_add, new_colors] = addHeTlEnRow(allTranslations[pr], trlit, ix, colors);
        content += to_add;
        colors = new_colors;
      }
    }
  }
  else if (["blocks"].includes(allTranslations[pr]["format"])) {
    let [blkHe, blkTl, blkEn] = ["", "", ""];
    for (let ix = 0; ix < allTranslations[pr]["text"].length; ix++) {
      const [tdHe, tdTl, tdEn, isEmpty, new_colors] = getHeTlEnRowTds(allTranslations[pr], trlit, ix, colors);
      blkHe += addRow(tdHe, ix, true, isEmpty, true, "he");
      blkTl += addRow(tdTl, ix, isEmpty, true, true, "tl");
      blkEn += addRow(tdEn, ix, isEmpty, true, true, "en");
      colors = new_colors;
      if (isEmpty) {
        content += blkHe + blkTl + blkEn;
        [blkHe, blkTl, blkEn] = ["", "", ""];
      }
    }
    if (blkEn !== "") {
      throw `Block format for ${pr} does not end with a break`;
    }
  }
  content += `</table>\n`;
  // Location-1 choices and presets
  if ("choices-presets-locations" in allTranslations[pr] && Object.values(allTranslations[pr]["choices-presets-locations"]).some(x => x == 1)) {
    content += `<h2>Translation Options</h2>\n`;
    content += `<table class="choices">\n`;
    i = 0;
    for (const ch in allTranslations[pr]["choices"]) {
      if ("choices-presets-locations" in allTranslations[pr] && allTranslations[pr]["choices-presets-locations"][ch] == 1) {
        content += `  <tr>`;
        content += `    <td class="choiceLabel">${inlineTransliterate(ch, trlit)}:</td>\n`;
        content += `    <td class="choiceSelect">\n`;
        content += `      <div id="cc${i}" class="selectContainer">\n`;
        content += `        <select id="cs${i}" title="${ch}" aria-label="${ch}"></select>\n`;
        content += `      </div>\n`;
        content += `    </td>\n`;
        content += `  </tr>\n`;
      }
      i++;
    }
    if ("presets" in allTranslations[pr] &&
        (("choices-presets-locations" in allTranslations[pr]) && allTranslations[pr]["choices-presets-locations"]["Preset"] == 1)) {
      content += `  <tr>`;
      content += `    <td class="choiceLabel">Preset:</td>\n`;
      content += `    <td class="choiceSelect">\n`;
      content += `      <div id="ccP" class="selectContainer">\n`;
      content += `        <select id="csP" title="Preset" aria-label="Preset"></select>\n`;
      content += `      </div>\n`;
      content += `    </td>\n`;
      content += `  </tr>\n`;
    }
    content += `</table>\n`;
  }
  // Translation notes
  if ("general-notes" in allTranslations[pr] || "translation-credit" in allTranslations[pr]) {
    content += `<h2>Translation Notes</h2>\n`;
    content += `<div class="generalNotes">\n`;
    if ("general-notes" in allTranslations[pr]) {
      for (const para of allTranslations[pr]["general-notes"]) {
        content += `<p>${inlineTransliterate(para.join(" "), trlit)}</p>`;
      }
    }
    if ("translation-credit" in allTranslations[pr]) {
      content += `  <div class="credits">${allTranslations[pr]["translation-credit"]}</div>`;
    }
    content += `</div>\n`;
  }
  content += `<div class="allLinks">\n`
  for (let i = 0; i < allLinks.length; i++) {
    content += ` <p>${translations[i][1]}: ${allLinks[i].join(" · \n")}</p>\n`
  }
  content += `</div>\n`;
  content += `<div class="footer">\n`;
  content += `  <a href="index.html" class="grey">Back to Interactive Translations</a> · \n`
  content += `  <a href="https://yacavone.net" class="grey">Back to my website</a>\n`
  content += `</div>\n`;
  content += `</body></html>`;
  // Finally, stringify `colors`
  header += `<script>var colors = ${JSON.stringify(colors)};</script>\n`;
  fs.writeFile("./" + page_name, header + content, err => {
    if (err) { console.error(err); }
  });
}
