
const fs = require('fs');
const _ = require("./lodash.js")
const hebrew_exceptions = require("./hebrew-exceptions.json");
const trlit_std = load_transliteration('./transliterations/standard.json');

// ...
function load_transliteration(filename) {
  trlit = require(filename);
  for (const sec of ["modifiers", "vowels"]) {
    for (const k in trlit[sec]) {
      trlit[sec][k[1]] = trlit[sec][k]
      delete trlit[sec][k]
    }
  }
  return trlit;
}

// ...
function transliterate(txt, trlit, includeSeps = true) {
  const seps = /([ |~*-]|\[[^\]]*\])/g;
  let result = "";
  let last_char = "";
  let last_was_en_exception = false;
  let sep_was_moved = false;
  for (let gp of txt.split(seps)) {
    // Separators
    if (gp.match(seps)) {
      if (gp == " ") {
        // Final exceptions (1/3)
        if (!last_was_en_exception) {
          for (const exn in trlit["final-exceptions"]) {
            if (result.slice(result.length - exn.length) == exn) {
              result = result.slice(0, result.length - exn.length) + trlit["final-exceptions"][exn];
            }
          }
        }
        result += " ";
        last_char = " ";
        last_was_en_exception = false;
      }
      else if (gp === "~") {
        // Final exceptions (2/3)
        if (!last_was_en_exception) {
          for (const exn in trlit["final-exceptions"]) {
            if (result.slice(result.length - exn.length) == exn) {
              result = result.slice(0, result.length - exn.length) + trlit["final-exceptions"][exn];
            }
          }
        }
        result += includeSeps ? gp : " ";
        last_char = " ";
        last_was_en_exception = false;
      }
      else if (gp === "|") {
        result += includeSeps && !sep_was_moved ? gp : "";
        last_was_en_exception = false;
        sep_was_moved = false;
      }
      else if (gp == "*") {
        result += gp;
        last_was_en_exception = false;
      }
      else if (gp[0] == "[") {
        result += gp.slice(1, gp.length - 1);
        last_was_en_exception = false;
      }
      else if (gp[0] == "-") {
        result += "-";
        last_char = " ";
        last_was_en_exception = false;
      }
      else {
        throw `Unimplemented separator: ${gp}`
      }
    }
    // English Exceptions
    else if (gp.replace("_", "") in trlit["exceptions"]) {
      result += trlit["exceptions"][gp.replace("_", "")];
      last_char = result[result.length - 1];
      last_was_en_exception = true;
    }
    else {
      // Hebrew Exceptions
      if (gp.replace("_", "") in hebrew_exceptions) {
        gp = hebrew_exceptions[gp.replace("_", "")] + (gp.includes("_") ? "_" : "");
      }
      let gp_result = "";
      let consonants = 0;
      let curr_consonant_he = "";
      let curr_consonant_en_with_vowel = "";
      let curr_consonant_en_without_vowel = "";
      let curr_vowels_en = "";
      for (let i = 0; i < gp.length; i++) {
        if (includeSeps && gp[i] === "_") {
          curr_consonant_en_with_vowel += "|";
          curr_consonant_en_without_vowel += "|";
          sep_was_moved = true;
          continue;
        }
        const in_dipthongs  = gp[i] in trlit["dipthongs"];
        const in_consonants = gp[i] in trlit["consonants"];
        const in_modifiers  = gp[i] in trlit["modifiers"];
        const in_vowels     = gp[i] in trlit["vowels"];
        if (!in_dipthongs && !in_consonants && !in_modifiers && !in_vowels) {
          throw `Unknown character: ${gp[i]}`
        }
        // Dipthongs (with lookahead!)
        if (in_dipthongs && (i == gp.length-1 || gp[i+1] in trlit["consonants"])) {
          if (curr_vowels_en.length > 0) {
            const last_vowel = curr_vowels_en[curr_vowels_en.length - 1];
            if (last_vowel in trlit["dipthongs"][gp[i]]) {
              curr_vowels_en += curr_vowels_en.slice(0,-1) + trlit["dipthongs"][gp[i]][last_vowel];
              continue;
            }
          }
          else if (curr_consonant_en_with_vowel in trlit["dipthongs"][gp[i]]) {
            curr_consonant_en_with_vowel += trlit["dipthongs"][gp[i]][curr_consonant_en_with_vowel];
            continue;
          }
          else if (curr_consonant_en_without_vowel in trlit["dipthongs"][gp[i]]) {
            curr_consonant_en_without_vowel += trlit["dipthongs"][gp[i]][curr_consonant_en_without_vowel];
            continue;
          }
          else if (last_char in trlit["dipthongs"][gp[i]]) {
            gp_result += trlit["dipthongs"][gp[i]][last_char];
            continue;
          }
        }
        // Consonants
        if (in_consonants) {
          let consonant_to_add = curr_vowels_en.length > 0 ? curr_consonant_en_with_vowel : curr_consonant_en_without_vowel;
          if (consonant_to_add.match(/[aeiou]/g) && last_char.match(/[aeiou]/g)) {
            consonant_to_add = trlit["multi-vowel-character"] + consonant_to_add;
          }
          gp_result += consonant_to_add + curr_vowels_en;
          if (gp_result.length > 0) {
            last_char = gp_result[gp_result.length - 1];
            last_was_en_exception = false;
          }
          consonants++;
          curr_consonant_he = gp[i];
          curr_consonant_en_with_vowel    = trlit["consonants"][gp[i]];
          curr_consonant_en_without_vowel = trlit["consonants"][gp[i]];
          curr_vowels_en = "";
        }
        // Modifiers
        if (in_modifiers) {
          if (curr_consonant_he in trlit["modifiers"][gp[i]]["rules"]) {
            const mod = trlit["modifiers"][gp[i]]["rules"][curr_consonant_he];
            if (mod == null) { }
            else if (typeof mod === "string") {
              curr_consonant_en_with_vowel    = mod;
              curr_consonant_en_without_vowel = mod;
            }
            else if (typeof mod === "object" && "with-vowel" in mod && "without-vowel" in mod) {
              curr_consonant_en_with_vowel    = mod["with-vowel"];
              curr_consonant_en_without_vowel = mod["without-vowel"];
            }
            else {
              throw `Malformed modifier in transliteration specification: ${mod}`;
            }
          }
          else if (trlit["modifiers"][gp[i]] === "must-match") {
            throw `Unexpected modifier combination: ${curr_consonant_he + gp[i]}`;
          }
        }
        // Vowels
        if (in_vowels) {
          let in_prog_last_char = last_char;
          if (curr_vowels_en.length > 0) {
            in_prog_last_char = curr_vowels_en[curr_vowels_en.length - 1];
          }
          else if (curr_consonant_en_with_vowel.length > 0) {
            in_prog_last_char = curr_consonant_en_with_vowel[curr_consonant_en_with_vowel.length - 1];
          }
          if (in_prog_last_char.match(/[aeiou]/g)) {
            curr_vowels_en += trlit["multi-vowel-character"];
            if (trlit["vowels"][gp[i]] !== trlit["multi-vowel-character"]) {
              curr_vowels_en += trlit["vowels"][gp[i]];
            }
          }
          else {
            curr_vowels_en += trlit["vowels"][gp[i]];
          }
        }
      }
      let consonant_to_add = curr_vowels_en.length > 0 ? curr_consonant_en_with_vowel : curr_consonant_en_without_vowel;
      if (consonant_to_add.match(/[aeiou]/g) && last_char.match(/[aeiou]/g)) {
        consonant_to_add = trlit["multi-vowel-character"] + consonant_to_add;
      }
      gp_result += consonant_to_add + curr_vowels_en;
      // Prefix consonants
      if (trlit["prefix-character"].length > 0
            && consonants == 1
            && trlit["prefix-consonants"].includes(curr_consonant_he)
            && curr_vowels_en[curr_vowels_en.length - 1] !== trlit["prefix-character"]) {
        gp_result += trlit["prefix-character"];
      }
      result += gp_result;
      if (result.length > 0) {
        last_char = result[result.length - 1];
        last_was_en_exception = false;
      }
    }
  }
  // Final exceptions (3/3)
  if (!last_was_en_exception) {
    for (const exn in trlit["final-exceptions"]) {
      if (result.slice(result.length - exn.length) == exn) {
        result = result.slice(0, result.length - exn.length) + trlit["final-exceptions"][exn];
      }
    }
  }
  // Final cleanup
  result = result.replace(/\*[a-z]/g, function(v) { return v.toUpperCase().slice(1); });
  return result;
}

function inlineTransliterate(str, trlit) {
  return str.replace(/\{([^\}]+)\}/g, function (_full_match, gp) {
    const spl = gp.split("/");
    if (spl.length == 2) {
      return `<span class="avoidwrap"><span class="inlineHe">${spl[0]}</span> (<i>${spl[1]}</i>)</span>`;
    }
    else {
      const he = gp.replace(/([|*_]|\[[^\]]*\])/g, "").replace(/([~])/g, " ");
      return `<span class="avoidwrap"><span class="inlineHe">${he}</span> (<i>${transliterate(gp, trlit, false)}</i>)</span>`;
    }
  })
}

// ...
const ibm_clrs = [/*[255, 213, 51],*/ [255, 215, 128],
                  /*[255, 176, 0],*/ [255, 176, 128],
                  /*[254, 97, 0],*/ [255, 165, 165],
                  /*[220, 38, 127],*/ [255, 153, 202],
                  /*[120, 94, 240],*/ /*[142, 120, 240],*/ [167, 149, 249],
                  /*[100, 143, 255]*/ [128, 164, 255]];
function ibm_color(p) {
  const i = Math.floor(3*p);
  const t = 3*p - i;
  return "rgba(" + ibm_clrs[i].map((e,k) => e*(1-t) + ibm_clrs[i+1][k]*t).join(", ") + ", 1.0)";
}

// Generating HTML

function addSpansHeTl(pr, ix, he) {
  let j = 0;
  let he_html = `<span id="ix${ix}-${pr}-${j}">`;
  for (let gp of he.replace(/([*_]|\[[^\]]*\])/g, "").split(/([ |~-])/g)) {
    if (gp === " " || gp === "-") {
      j++;
      he_html += `</span>` + gp + `<span id="ix${ix}-${pr}-${j}">`;
    }
    else if (gp === "|") {
      j++;
      he_html += `</span><span id="ix${ix}-${pr}-${j}">`;
    }
    else if (gp === "~") {
      he_html += ` `;
    }
    else {
      he_html += gp;
    }
  }
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

function addHeTlEnRow(pr, trlit, ix, colors, line_nos = true) {
  const [_v, he, en, notes] = pr["text"][ix];
  const tl = transliterate(he, trlit, true);
  const [he_max_j, he_html] = addSpansHeTl("he", ix, he);
  const [_tl_max_j, tl_html] = addSpansHeTl("tl", ix, tl);
  const [en_js, en_html] = addSpansEn(ix, en);
  for (let j = 0; j <= he_max_j; j++) {
    colors[ix+"-"+j] = ibm_color(j / (he_max_j == 0 ? 1 : he_max_j));
  }
  for (const j of en_js) {
    if (!((ix+"-"+j) in colors)) {
      colors[ix+"-"+j] = ibm_color(4/3);
    }
  }
  let content = "";
  content += `  <tr id="ix${ix}-tr">`;
  if (line_nos) { content += `    <td id="ix${ix}-lno1" class="line_no${en.length == 0 ? "_empty" : ""}">/</td>\n`; }
  content += `    <td id="ix${ix}-hetd" class="he" dir="rtl">${he_html}</td>\n`;
  content += `    <td id="ix${ix}-tltd" class="tl">${tl_html}</td>\n`;
  content += `    <td id="ix${ix}-entd" class="en">${en_html}</td>\n`;
  if (line_nos) { content += `    <td id="ix${ix}-lno2" class="line_no${en.length == 0 ? "_empty" : ""}">/</td>\n`; }
  content += `  </tr>\n`;
  return [content, colors];
}

prayers = require("./prayers.json");

// Make index.html
const index_pr = { "text": [ ["", "זִכְרוֹנָ_|ם לִ|בְרָכָה", "[May](4) [their](1) [memory](0) [be](4) [for](2) [a blessing](3)"] ] };
const [index_row, index_colors] = addHeTlEnRow(index_pr, trlit_std, 0, {}, false);
let index = `<!DOCTYPE html><html>\n`;
index += `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n`;
index += `<title>Interactive Translations</title>\n`;
index += `<link rel="stylesheet" href="style.css" />\n`;
index += `<script type="text/javascript" src="jquery.min.js"></script>\n`;
index += `<script>var pr = ${JSON.stringify(index_pr)};</script>\n`;
index += `<script>var colors = ${JSON.stringify(index_colors)};</script>\n`;
index += `<script>var ibm_clrs = ${JSON.stringify(ibm_clrs)};</script>\n`;
index += `<script type="text/javascript" src="index.js"></script>\n`;
index += `<script type="text/javascript">$(document).ready(function () { $('td[id$="-tltd"]').addClass("hidden"); });</script>`
index += `</head>\n<body>\n`;
index += `<div class="titleAndCredits" style="margin-bottom:40px">\n`;
index += `<h1>Interactive Translations</h1>\n`
index += `<div class="credits noStyle">\n`;
index += `  <p>In memory of:</p>\n`;
index += `  <p><i>Chazan</i> Ilan Mamber, who gave my family our love of Jewish music</p>\n`;
index += `  <p>Susan Amy Yacavone, my mother, whose favorite prayers will all be here</p>\n`;
index += `  <table class="inheritFontSize">\n${index_row}</table>\n`;
index += `</div>\n`;
index += `</div>\n`;
index += `<table>\n`;
for (const pr of Object.keys(prayers).sort()) {
  const page_name = pr.replace(" ", "_") + ".html";
  const title = "title" in prayers[pr] ? prayers[pr]["title"] : pr;
  index += `  <tr><td><a href="${page_name}">${title}</a></td></tr>\n`;
}
index += `</table>\n</body></html>`;
fs.writeFile("./index.html", index, err => {
  if (err) { console.error(err); }
});

// Make each prayer's page
for (const pr in prayers) {
  const page_name = pr.replace(" ", "_") + ".html";
  const title = "title" in prayers[pr] ? prayers[pr]["title"] : pr;
  let trlit = trlit_std;
  if ("transliteration" in prayers[pr] && "standard" in prayers[pr]["transliteration"]) {
    trlit = _.merge(_.cloneDeep(trlit_std), prayers[pr]["transliteration"]["standard"]);
  }
  let colors = {};
  // Header (wait to stringify `colors`!)
  let header = `<!DOCTYPE html><html>\n`;
  header += `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n`;
  header += `<title>${title}</title>\n`;
  header += `<link rel="stylesheet" href="style.css" />\n`;
  header += `<script type="text/javascript" src="jquery.min.js"></script>\n`;
  header += `<script>var pr = ${JSON.stringify(prayers[pr])};</script>\n`;
  let content = `<script type="text/javascript" src="index.js"></script>\n`;
  content += `</head>\n<body>\n`;
  // Title
  content += `<div class="titleAndCredits">\n`;
  content += `  <h1>${title}</h1>\n`;
  if ("text-credit" in prayers[pr]) {
    content += `  <div class="credits">${prayers[pr]["text-credit"]}</div>`;
  }
  content += `</div>\n`;
  // Location-0 choices/presets
  content += `<table class="choices">\n`;
  let i = 0;
  for (const ch in prayers[pr]["choices"]) {
    if (!("choices-presets-locations" in prayers[pr]) || prayers[pr]["choices-presets-locations"][ch] == 0) {
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
  if ("presets" in prayers[pr] &&
      (!("choices-presets-locations" in prayers[pr]) || prayers[pr]["choices-presets-locations"]["Preset"] == 0)) {
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
  // ...
  content += `<div class="checkboxes">\n`;
  content += `  <div id="layoutContainer" class="selectContainer layoutContainer">\n`;
  content += `    <select id="layout-select" title="Layout" aria-label="Layout" class="layoutContainer">\n`;
  content += `      <option value="0">1 Col.</option>`
  content += `      <option value="1">2 Col.</option>`
  content += `      <option value="2">Blocks</option>`
  content += `    </select>\n`;
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
  content += `    <label for="color-checkbox">Color</label>\n`
  content += `  </div>\n`;
  content += `</div>\n`;
  // Text
  content += `<table class="text">\n`;
  for (let ix = 0; ix < prayers[pr]["text"].length; ix++) {
    const [to_add, new_colors] = addHeTlEnRow(prayers[pr], trlit, ix, colors);
    content += to_add;
    colors = new_colors;
  }
  content += `</table>\n`;
  // Location-1 choices and presets
  if ("choices-presets-locations" in prayers[pr] && Object.values(prayers[pr]["choices-presets-locations"]).some(x => x == 1)) {
    content += `<h2>Translation Options</h2>\n`;
    content += `<table class="choices">\n`;
    i = 0;
    for (const ch in prayers[pr]["choices"]) {
      if ("choices-presets-locations" in prayers[pr] && prayers[pr]["choices-presets-locations"][ch] == 1) {
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
    if ("presets" in prayers[pr] &&
        (("choices-presets-locations" in prayers[pr]) && prayers[pr]["choices-presets-locations"]["Preset"] == 1)) {
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
  if ("general-notes" in prayers[pr]) {
    content += `<h2>Translation Notes</h2>\n`;
    content += `<div class="generalNotes">\n`;
    for (const para of prayers[pr]["general-notes"]) {
      content += `<p>${inlineTransliterate(para.join(" "), trlit)}</p>`;
    }
    content += `</div>\n`;
  }
  content += `<div class="footer">\n`;
  content += `  <a href="index.html" class="grey">Back to prayer list</a> · \n`
  content += `  <a href="https://yacavone.net" class="grey">Back to my website</a>\n`
  content += `</div>\n`;
  content += `</body></html>`;
  // Finally, stringify `colors`
  header += `<script>var colors = ${JSON.stringify(colors)};</script>\n`;
  header += `<script>var ibm_clrs = ${JSON.stringify(ibm_clrs)};</script>\n`;
  fs.writeFile("./" + page_name, header + content, err => {
    if (err) { console.error(err); }
  });
}




// Testing

// console.log("---------")
// console.log(transliterate("בָעוּתְ", trlit_std));


// prayers = require("./prayers.json");
// for (const pr in prayers) {
//   console.log("\n" + pr);
//   console.log("------------------------")
//   for (const [v, he, en, notes] of prayers[pr]["text"]) {
//     let trlit = trlit_std;
//     if ("transliteration" in prayers[pr] && "standard" in prayers[pr]["transliteration"]) {
//       trlit = _.merge(_.cloneDeep(trlit_std), prayers[pr]["transliteration"]["standard"]);
//     }
//     console.log(transliterate(he, trlit , true));
//   }
//   console.log("\n");
// }