
// Hebrew character sets
const he_letters = { alepf: "א", bet: "ב", gimel: "ג", dalet: "ד", he: "ה", vav: "ו", zayin: "ז", chet: "ח", tet: "ט", yod: "י", kaf: "כ", lamed: "ל", mem: "מ", nun: "נ", samech: "ס", ayin: "ע", peh: "פ", tsadi: "צ", qof: "ק", resh: "ר", shin: "ש", tav: "ת" };
const he_final_letters = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const he_vowels = { kamatz: "ָ", patach: "ַ", patachRed: "ֲ", tsere: "ֵ", segol: "ֶ", segolRed: "ֱ", hiriq: "ִ", holam: "ֹ", kamatzRed: "ֳ", kubutz: "ֻ", shva: "ְ", qamatzQatan: "ׇ", holamVav: "ֺ", holamAlt: "ׄ", hiriqAlt: "ׅ" };
const he_marks = { dagesh: "ּ", shinDot: "ׁ", sinDot: "ׂ" };
const he_gershayim = { geresh: "׳", gershayim: "״" };
const he_special_chars = { capitalize: "*", sepWithVowel: "_", sep: "|", onlyEnStart: "[", onlyEnEnd: "]" };

// RegExps for Hebrew character sets
const he_everything_re = /[\u0590-\u05FF\*\|_]/g;
const he_modifier_re = /[\u0590-\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const he_letter_re = /[א-ת]/g;
const he_vowel_re = /[\u0590-\u05BB\u05C4\u05C5\u05C7]/g;
const he_mark_re = /[\u05BC\u05C1\u05C2]/g;
const he_gershayim_re = /[׳״]/g;

// RegExps for Hebrew structures
const he_word_re = new RegExp(`(${he_everything_re.source}+)`, "g");
const he_pointed_letter_re = new RegExp(`(\\*)?(${he_letter_re.source})(${he_modifier_re.source}*)(${he_gershayim_re.source})?(_?\\|)?`, "g");
const he_pointed_letter_re_groups = 5;

// A pointed Hebrew letter, consisting of:
// - possibly a `'*'` to indicate capitalization (`this.capitalization`)
// - a letter from `he_letters` (`this.letter`)
// - possibly a dagesh (`this.dagesh`, constructed from `markings` argument)
// - possibly a shin or sin dot (`this.shinOrSinDot`, constructed from `markings` argument)
// - possibly a vowel from `he_vowels` (`this.vowel`, constructed from `markings` argument)
// - possibly a geresh or gershayim (`this.gershayim`)
// - possibly a separator `'|'` or a vowel separator `'_|'` (`this.sep`)
class HePointedLetter {
  constructor(capitalize, letter, markings, gershayim, sep) {
    this.capitalize = capitalize === "*";
    this.letter = letter;
    // For every marking given...
    [this.dagesh, this.shinOrSinDot, this.vowel] = [false, "", ""];
    for (let marking of markings.replace("◌", "")) {
      // first, normalize any vowel markings
      if (marking === "\u05C4") { marking = he_vowels.holam; }
      if (marking === "\u05C5") { marking = he_vowels.hiriq; }
      // add dagesh
      if (marking === he_marks.dagesh) { this.dagesh = true; }
      // add vowel marking
      else if (/[\u05B0-\u05BB\u05C7]/.test(marking)) {
        if (this.vowel !== "") { throw `Double vowel on letter: ${letter} (${letter + markings})` }
        this.vowel = marking;
      }
      // add shin/sin dot
      else if (marking === he_marks.shinDot) {
        if (this.letter !== he_letters.shin) { throw `Shin dot on non-shin: ${letter} (${letter + markings})` }
        this.shinOrSinDot = marking;
      }
      else if (marking === he_marks.sinDot) {
        if (this.letter !== he_letters.shin) { throw `Sin dot on non-shin: ${letter} (${letter + markings})` }
        this.shinOrSinDot = marking;
      }
      else {
        throw `Unknown vowel marking: ◌${marking} (${letter + markings})`
      }
    }
    this.gershayim = gershayim == undefined ? "" : gershayim;
    this.sep = sep === undefined ? "" : sep;
  }
  toString() {
    const markings = "◌" + (this.dagesh ? he_marks.dagesh : "") + this.shinOrSinDot + this.vowel;
    return `${this.constructor.name}('${this.capitalize ? "*" : ""}', '${this.letter}', '${markings}', '${this.sep}')`;
  }
  numericValue() {
    const gematria = {"א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400, "ך": 500, "ם": 600, "ן": 700, "ף": 800, "ץ": 900 };
    if (!(this.letter in gematria)) { throw `Could not find gematria for letter: ${this.letter}`; }
    return gematria[this.letter];
  }
  hasNoVowelOrShva() {
    return ["", he_vowels.shva, he_vowels.patachRed,
            he_vowels.segolRed, he_vowels.kamatzRed].includes(this.vowel);
  }
}

// A Hebrew word, consisting of some number of `HeLetter`s
class HeWord {
  constructor(letters = []) { this.letters = letters; }
  add(letter) { this.letters.push(letter); }
  toString() { return `${this.constructor.name}([${this.letters.map((l) => l.toString()).join(", ")}])` }
  numericValue() {
    let value = 0;
    for (let i = 0; i < this.letters.length; i++) {
      value += this.letters[j].numericValue();
      // If we encouter a geresh not at the end, everything we've seen is x1000
      if (this.letters[j].gershayim === he_gershayim.geresh
          && i < this.letters.length - 1) {
        value *= 1000;
      }
    }
    return value;
  }
  isAbbrev() {
    return this.letters.length === 1 && this.letters[0].gershayim === he_gershayim.geresh
           || this.letters.some((letter) => letter.gershayim === he_gershayim.gershayim);
  }
}

// Split a Hebrew string into a list of `HeWord`s, interspersed with (possibly empty)
// strings of non-Hebrew characters
function splitHe(str) {
  return str.replace(/[\[\]]/g, "").split(he_word_re).map(function (gp, i) {
    if (i % 2 == 0) { return gp; }
    const gps = gp.split(he_pointed_letter_re);
    let word = new HeWord();
    for (let j = 1; j < gps.length; j += he_pointed_letter_re_groups + 1) {
      const args = [...Array(he_pointed_letter_re_groups).keys()].map((k) => gps[j+k]);
      const unhandled = gps[j + he_pointed_letter_re_groups];
      word.add(new HePointedLetter(...args));
    }
    return word;
  });
}

// Definition of the encoding
const code_en = ["a", "A", "b", "B", "c", "C", "d", "D", "e", "E", "f", "F",  "g",  "G", "h", "H", "i", "I",  "j",  "J", "k", "K", "l", "L", "m", "M", "n", "N", "o", "O", "p", "P", "q", "Q", "r", "R", "s", "S", "t", "T", "u", "U", "v", "V", "w", "W", "x", "X", "y", "Y", "z", "Z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const code_he = ["א", "אּ", "ב", "בּ", "ג", "גּ", "ד", "דּ", "ה", "הּ", "ו", "וּ", "◌̥א", "◌̥ה", "ח", "חּ", "י", "יּ", "◌̥ו", "◌̥י", "כ", "כּ", "ל", "לּ", "מ", "מּ", "נ", "נּ", "ע", "עּ", "פ", "פּ", "ק", "קּ", "ר", "רּ", "שׁ", "שּׁ", "ת", "תּ", "ט", "טּ", "◌ְ", "◌ְֿ", "ס", "סּ", "צ", "צּ", "שׂ", "שּׂ", "ז", "זּ", "◌ָ", "◌ַ", "◌ֲ", "◌ֵ", "◌ֶ", "◌ֱ", "◌ִ", "◌ֹ", "◌ֳ", "◌ֻ"];
const code_he_explanations = {
  "F": "{ו/Vav} with {דָּגֵשׁ}",
  "g": "{א/Alef} as {אֵם קְרִיאָה}, \"mater lectionis\"",
  "G": "{ה/Hei} as {אֵם קְרִיאָה}, \"mater lectionis\"",
  "j": "{ו/Vav} as {אֵם קְרִיאָה}, \"mater lectionis\"",
  "J": "{י/Yod} as {אֵם קְרִיאָה}, \"mater lectionis\"",
  "v": "Mute {שְׁוָא}",
  "V": "Pronounced {שְׁוָא}"
};
const code_special_chars = { sep: "|", capitalize: "*", literalStart: "[", literalEnd: "]", special: "." };
// RegExp of the encoding
const code_en_re = /[A-Za-z0-9\|\[\]\.]/g;

// Encode a single HeWord
function encodeWord(word, i = undefined) {
  let result = "";
  // Handle an abbreviation
  if (word.isAbbrev()) {
    if (i !== undefined) { throw `Hebrew numbers/abbrevations not yet implemented!`; }
    else { throw `At word ${i}, Hebrew numbers/abbrevations not yet implemented!`; }
  }
  // Handle a word
  else {
    const letters = word.letters;
    let last_was_ml = false;
    for (let j = 0; j < letters.length; j++) {
      const err_loc = "At" + i === undefined ? ` word ${i}` : "" + ` letter ${(j-1)/2}`;
      let letter_to_enc = letters[j].letter;
      let vowel_to_enc = letters[j].vowel;
      let capitalize_to_add = letters[j].capitalize ? "*" : "";
      let vowel_sep_to_add = letters[j].sep === "_|" ? "|" : "";
      let final_sep_to_add = letters[j].sep === "|" ? "|" : "";
      const curr_hasNoVowelOrShva = letters[j].hasNoVowelOrShva();
      // NOTE: The previous letter "has a vowel" if it was a M.L.
      const last_hasNoVowelOrShva = j == 0 || letters[j-1].hasNoVowelOrShva() || last_was_ml;
      // Vav with no vowel (or with a shva), with a dagesh, and with no
      // preceeding non-shva vowel is a M.L. for kubutz (i.e. the dagesh is
      // really a shuruk) unless the next character is also a Vav no vowel
      // (or with a shva) and with a dagesh
      if (letter_to_enc === he_letters.vav &&
          curr_hasNoVowelOrShva &&
          letters[j].dagesh &&
          last_hasNoVowelOrShva &&
          !(j < letters.length - 1 &&
            letters[j+1].letter === he_letters.vav &&
            letters[j+1].hasNoVowelOrShva() &&
            letters[j+1].dagesh)) {
        result += capitalize_to_add +
                  code_en[code_he.indexOf("◌" + he_vowels.kubutz)] + vowel_sep_to_add +
                  code_en[code_he.indexOf("◌̥" + he_letters.vav)] + final_sep_to_add;
        last_was_ml = true;
        continue;
      }
      // Alef or Vav with a holam, with no dagesh, and with no preceeding non-shva
      // vowel is a M.L. for a holam on the previous letter
      if ([he_letters.alepf, he_letters.vav].includes(letter_to_enc) &&
          vowel_to_enc === he_vowels.holam &&
          !letters[j].dagesh &&
          last_hasNoVowelOrShva) {
        result += capitalize_to_add +
                  code_en[code_he.indexOf("◌" + he_vowels.holam)] + vowel_sep_to_add +
                  code_en[code_he.indexOf("◌̥" + he_letters.vav)] + final_sep_to_add;
        last_was_ml = true;
        continue;
      }
      // Any Alef, Hei, Vav, or Yod with no vowel, without a dagesh unless
      // it is a Yod, and with a preceeding non-shva vowel is a M.L. if
      // the letter / preceeding vowel pair are in `ml_pairs`
      const non_vav_ml_vowels = [he_vowels.kamatz, he_vowels.patach,
                                 he_vowels.tsere, he_vowels.segol,
                                 he_vowels.hiriq, he_vowels.holam,
                                 he_vowels.kubutz];
      const ml_pairs = { [he_letters.alepf]: non_vav_ml_vowels,
                         [he_letters.he]: non_vav_ml_vowels,
                         [he_letters.vav]: [he_vowels.hiriq, he_vowels.holam],
                         [he_letters.yod]: non_vav_ml_vowels }
      if (letter_to_enc in ml_pairs &&
          letters[j].vowel === "" &&
          (!letters[j].dagesh || letter_to_enc === he_letters.yod) &&
          !last_hasNoVowelOrShva &&
          (ml_pairs[letter_to_enc].includes(letters[j-1].vowel) || last_was_ml)) {
        result += vowel_sep_to_add +
                  code_en[code_he.indexOf("◌̥" + letter_to_enc)] + final_sep_to_add;
        last_was_ml = true;
        continue;
      }
      // A final patach is a Furtive Patach if the letter is a Hei, Chet, or Ayin,
      // and there is a dagesh whenever the letter is a Hei
      // FIXME: add back in support for furtive Ayin?
      const furtive_patach = j === letters.length-1 &&
                             [he_letters.he, he_letters.chet/*, he_letters.ayin*/].includes(letter_to_enc) &&
                             (letters[j].dagesh || letter_to_enc !== he_letters.he) &&
                             vowel_to_enc === he_vowels.patach;
      // Encode the letter, any dagesh, and any shin/sin dot
      if (letter_to_enc in he_final_letters) { letter_to_enc = he_final_letters[letter_to_enc]; }
      letter_to_enc += letters[j].shinOrSinDot;
      if (letter_to_enc === he_letters.shin) { letter_to_enc += he_marks.shinDot; }
      letter_to_enc += letters[j].dagesh ? he_marks.dagesh : "";
      const ix_letter = code_he.indexOf(letter_to_enc);
      if (ix_letter === -1) { throw `${err_loc}, failed to encode letter: ${letter_to_enc}`; }
      let coded_letter = code_en[ix_letter];
      // Encode any vowel
      let coded_vowel = "";
      if (vowel_to_enc.length > 0) {
        if (he_vowels.hiriqAlt === vowel_to_enc) { vowel_to_enc = he_vowels.hiriq; }
        if ([he_vowels.qamatzQatan, he_vowels.holamVav, he_vowels.holamAlt].includes(vowel_to_enc)) {
          vowel_to_enc = he_vowels.holam;
        }
        const ix_vowel = code_he.indexOf("◌" + vowel_to_enc);
        if (ix_vowel === -1) { throw `${err_loc}, failed to encode vowel: ◌${vowel_to_enc}`; }
        coded_vowel = code_en[ix_vowel];
      }
      // Encode any geresh
      if (letters[j].gershayim === he_gershayim.geresh) {
        throw `${err_loc}, geresh not yet implemented!`
      }
      // Add the encoded string, plus any separator, to our result - taking
      // into account furtive patach
      let [to_add_1, to_add_2] = furtive_patach ? [coded_vowel, coded_letter]
                                                : [coded_letter, coded_vowel];
      result += capitalize_to_add + to_add_1 + vowel_sep_to_add + to_add_2 + final_sep_to_add;
      last_was_ml = false;
    }
  }
  return result;
}

// Encode a Hebrew string as an array of encoded strings interspersed with (possibly empty)
// strings of non-Hebrew characters
function encodeToArray(str, trlit = default_trlit) {
  return splitHe(str).map(function (gp, i) {
    if (i % 2 == 0) { return gp; }
    return encodeWord(gp, (i-1)/2);
  });
}
exports.encodeToArray = encodeToArray;

// Encode a Hebrew string as a string
function encodeToString(str) {
  return splitHe(str).map(function (gp, i) {
    if (i % 2 == 0) {
      return gp.replace(new RegExp(`${code_en_re.source}+`, "g"), (x) => `[${x}]`);
    }
    return encodeWord(gp, (i-1)/2);
  }).join("");
}
exports.encodeToString = encodeToString;

// A class representing a transliteration
class Trlit {
  constructor(obj_or_code) {
    this._ = [];
    this.addAll(obj_or_code);
  }
  addAll(obj_or_code) {
    if (typeof obj_or_code === "object") {
      for (const k of code_en) {
        if (k in obj_or_code) { this[k] = obj_or_code[k]; }
      }
      if ("_" in obj_or_code) {
        this._ = obj_or_code._.concat(this._);
      }
    }
    else if (typeof obj_or_code === "string") {
      throw `String parsing not yet supported!`;
    }
    return this;
  }
  copy() {
    return new Trlit(this);
  }
}
exports.Trlit = Trlit;

// The default transliteration
const default_trlit = new Trlit({
  /* א */ "a": ".v",
  /* ב */ "b": "v",
  /* בּ */ "B": "b",
  /* ג */ "c": "g",
  /* ד */ "d": "d",
  /* ה */ "e": "h",
  /* ו */ "f": "v",
  /* ◌̥א */ "g": "",
  /* ◌̥ה */ "G": "",
  /* ח */ "h": "ch",
  /* י */ "i": "y",
  /* ◌̥ו */ "j": "",
  /* ◌̥י */ "J": "",
  /* כ */ "k": "ch",
  /* כּ */ "K": "k",
  /* ל */ "l": "l",
  /* מ */ "m": "m",
  /* נ */ "n": "n",
  /* ע */ "o": ".v",
  /* פ */ "p": "f",
  /* פּ */ "P": "p",
  /* ק */ "q": "k",
  /* ר */ "r": "r",
  /* שׁ */ "s": "sh",
  /* ת */ "t": "t",
  /* ט */ "u": "t",
  /* ◌ְ */ "v": "'",
  /* ◌ְּ */ "V": "'",
  /* ׂׂס */ "w": "s",
  /* ׂׂצ */ "x": "tz",
  /* שׂ */ "y": "s",
  /* ז */ "z": "z",
  /* ◌ָ */ "0": ".1",
  /* ◌ַ */ "1": "a",
  /* ◌ֲ */ "2": ".1",
  /* ◌ֵ */ "3": ".4",
  /* ◌ֶ */ "4": "e",
  /* ◌ֱ */ "5": ".4",
  /* ◌ִ */ "6": "i",
  /* ◌ֹ */ "7": "o",
  /* ◌ֳ */ "8": ".7",
  /* ◌ֻ */ "9": "u",
  "_": [
    // ================ Matres lectionis exceptions ================
    /* bore[i] */ ["^B7jr3g$", ".B7jr3J"],
    /* l'e[i]la */ ["^lvo3L0g$", ".lvo3JL0g"],
    /* hine[i] */ ["^e6N3G$", ".e6N3J"],
    // ================ Matres lectionis rules ================
    /* hiriq yod vowel */ ["6J", "i"],
    /* tsere yod dipthong */ ["3(\\|)?J", "ei"],
    /* trailing M.L. yod */ ["J$", "i"],
    /* trailing M.L. hei */ ["G$", "h"],
    /* silent M.L. then vowel */ ["[gGjJ]([0-9])", "'.$1"],
    // ================ Alef/Ayin/Shva ================
    /* pass along capitalization on a alef or ayin */ ["\\*([aAoO])", ".$1*"],
    /* leading alef or ayin */ ["^[aAoO]", ""],
    /* trailing alef or ayin */ ["[aAoO][vV]?$", ""],
    /* trailing shva */ ["[vV]$", ""],
    /* mute shva then alef or ayin */ ["v(\\|)?([aAoO])", ".$1$2"],
    // ================ Special cases ================
    /* Tetragrammaton as Adonai */ ["[iI][vV2]([eE]7?f0[eE]|7?[iI]0)", ".*a2d7n0J"],
    /* Tetragrammaton as Elohim */ ["[iI][vV5]([eE]7?f6[eE]|7?[iI]6)", ".*a5l7e6Jm"],
    /* Yisrael */ ["\\*?i6yvr0a3l", "Yisrael"],
    /* Shabbat */ ["\\*?[sS][01]B[01]t", "Shabbat"],
  ]
});
Object.freeze(default_trlit);
exports.default_trlit = default_trlit;

// Parse the RHS of a transliteration entry as a decoded and encoded part
function parseTrlitRHS(rhs) {
  let [dec, enc] = rhs.split(".");
  if (dec === undefined) { dec = ""; }
  if (enc === undefined) { enc = ""; }
  return [dec, enc];
}

// Transliterate the given encoded word with the given transliteration
function transliterateEncodedWord(encWord, trlit = default_trlit) {
  let result = "";
  let [capitalize, at_start] = [false, true];
  outerLoop: while (encWord.length > 0) {
    // Do any regex replaces first
    for (let [re, rhs] of trlit._) {
      if (re[0] === "^") { if (!at_start) { continue; } }
      else { re = "^" + re; }
      const match = encWord.match(new RegExp(re));
      if (match !== null) {
        rhs = rhs.replace(/\$[0-9]+/g, (s) => match[parseInt(s.slice(1))] || "");
        let [dec, enc] = parseTrlitRHS(rhs);
        if (dec !== "") {
          if (capitalize) { dec = dec[0].toUpperCase() + dec.slice(1); }
          capitalize = false;
          at_start = false;
        }
        result += dec;
        encWord = enc + encWord.slice(match[0].length);
        continue outerLoop;
      }
    }
    // Handle any special characters
    if (encWord[0] === code_special_chars.sep) {
      result += code_special_chars.sep;
      encWord = encWord.slice(1);
      continue;
    }
    if (encWord[0] === code_special_chars.capitalize) {
      capitalize = true;
      encWord = encWord.slice(1);
      continue;
    }
    // Do a normal transliteration
    let to_dec = encWord[0];
    if (!(to_dec in trlit)) {
      to_dec = to_dec.toLowerCase();
      if (!(to_dec in trlit)) { throw `No implementation for: ${to_dec}`; }
    }
    let [dec, enc] = parseTrlitRHS(trlit[to_dec]);
    if (dec !== "") {
      if (capitalize) { dec = dec[0].toUpperCase() + dec.slice(1); }
      capitalize = false;
      at_start = false;
    }
    result += dec;
    encWord = enc + encWord.slice(1);
  }
  return result;
}
exports.transliterateEncodedWord = transliterateEncodedWord;

// Transliterate a result of `encodeToArray` with the given transliteration
function transliterateEncodedArray(arr, trlit = default_trlit) {
  return arr.map(function (gp, i) {
    if (i % 2 == 0) { return gp; }
    return transliterateEncodedWord(gp, trlit);
  }).join("");
}
exports.transliterate = transliterate;

// Transliterate a Hebrew string with the given transliteration
function transliterate(str, trlit = default_trlit) {
  return transliterateEncodedArray(encodeToArray(str), trlit);
}
exports.transliterate = transliterate;
