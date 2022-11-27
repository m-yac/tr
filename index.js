
const choices = Object.keys("choices" in pr ? pr["choices"] : {});

var current_choice = ""; // this gets set to a string of length `choices.length` after update()
var made_a_choice = false;
function in_current_choice(str) {
  return current_choice.match(new RegExp("^" + str, "g"));
}
function encodeChoiceVal(k) { return k.toString(36).toUpperCase(); }
function decodeChoiceVal(val) { return parseInt(val, 36); }

function update(choice) {
  // Update `current_choices`
  for (let i = 0; i < choices.length; i++) {
    // If choice `i` has yet to be initalized in `current_choice`
    // or choice `i` in `choice` is not valid w.r.t. `current_choice`,
    // set choice `i` in `current_choice` to its default value
    if (current_choice[i] === undefined ||
        !in_current_choice(pr["choices"][choices[i]][decodeChoiceVal(choice[i])][0])) {
      // If we have a default choice, calculate it
      if ("default-choices" in pr && choices[i] in pr["default-choices"]) {
        for (let j = 0; j < pr["default-choices"][choices[i]].length; j++) {
          const [re_str, k] = pr["default-choices"][choices[i]][j];
          if (in_current_choice(re_str)) {
            current_choice = current_choice.slice(0,i)
                           + encodeChoiceVal(k)
                           + current_choice.slice(1+i);
            break;
          }
        }
      }
      // Otherwise set it to the first valid choice
      else {
        for (let j = 0; j < pr["choices"][choices[i]].length; j++) {
          const re_str = pr["choices"][choices[i]][j][0];
          if (in_current_choice(re_str)) {
            current_choice = current_choice.slice(0,i)
                           + encodeChoiceVal(j)
                           + current_choice.slice(1+i);
            break;
          }
        }
      }
    }
    // Otherwise set choice `i` in `current_choice` to that in `choice`
    else {
      current_choice = current_choice.slice(0,i)
                     + choice[i]
                     + current_choice.slice(1+i);
    }
  }
  // Log and update URL
  if (choice !== "") {
    made_a_choice = true;
    console.log("Updating to: " + choice + " | Result: " + current_choice);
  }
  // Add choices to selects
  for (let i = 0; i < choices.length; i++) {
    $(`#cs${i}`).empty();
    for (let j = 0; j < pr["choices"][choices[i]].length; j++) {
      const ch_i = pr["choices"][choices[i]][j];
      if (in_current_choice(ch_i[0])) {
        let opt = $('<option>').text(ch_i[1])
                               .attr("value", encodeChoiceVal(j))
                               .attr("id", `cs${i}o${j}`);
        $(`#cs${i}`).append(opt);
      }
    }
    $(`#cs${i}`).val(current_choice[i]);
  }
  // Set preset
  if ("presets" in pr) {
    for (let j = 0; j < pr["presets"].length; j++) {
      if (in_current_choice(pr["presets"][j][0])) {
        $(`#csP`).val(j);
        break;
      }
    }
  }
  // Hide rows and update row numbers based on current choices
  let line_no = 1;
  for (let ix = 0; ix < pr["text"].length; ix++) {
    if (in_current_choice(pr["text"][ix][0])) {
      $(`tr[id^="ix${ix}-tr"]`).removeClass("hidden");
      if (pr["text"][ix][1].length > 0) {
        $(`td[id^="ix${ix}-lno"]`).text(line_no);
        line_no++;
      }
    }
    else {
      $(`tr[id^="ix${ix}-tr"]`).addClass("hidden");
      $(`td[id^="ix${ix}-lno"]`).text("/");
    }
  }
}

const ibm_clrs = [/*[255, 213, 51],*/ [255, 215, 128],
                  /*[255, 176, 0],*/ [255, 176, 128],
                  /*[254, 97, 0],*/ [255, 165, 165],
                  /*[220, 38, 127],*/ [255, 153, 202],
                  /*[120, 94, 240],*/ /*[142, 120, 240],*/ [167, 149, 249],
                  /*[100, 143, 255]*/ [128, 164, 255]];
const dark_ibm_clrs = ibm_clrs.map((cs) => cs.map((c) => c < 100 ? 0 : Math.round(c - 100)));
function ibm_color(p, a) {
  const i = Math.floor(3*p);
  const t = 3*p - i;
  const clrs = $('#dark-checkbox').is(":checked") ? dark_ibm_clrs : ibm_clrs;
  return `rgba(${clrs[i].map((e,k) => e*(1-t) + clrs[i+1][k]*t).join(", ")}, ${a})`;
}

function updateHighlighting(ix) {
  const trs_hover = $(`tr[id^="ix${ix}-tr"]`).filter(function () { return $(this).is(":hover"); })
  if ($('#color-checkbox').is(":checked") || trs_hover.length > 0) {
    const spans_hover = $(`span[id^="ix${ix}-"]`).filter(function () { return $(this).is(":hover"); });
    const hover_alpha = $('#dark-checkbox').is(":checked") ? 1/2 : 1/3;
    const alpha = spans_hover.length == 0 ? 1.0 : hover_alpha;
    const hover_j = spans_hover.length == 0 ? null : spans_hover[0].id.split("-")[2];
    $(`span[id^="ix${ix}-"]`).addClass("highlighted").each(function () {
      const j = this.id.split("-")[2];
      const this_alpha = j === hover_j ? 1.0 : alpha;
      $(this).css("background-color", ibm_color(colors[ix+"-"+j], this_alpha));
    });
  }
  else {
    $(`span[id^="ix${ix}-"]`).removeClass("highlighted").removeClass("underlined").css("background-color", "");
  }
  if (trs_hover.length > 0) {
    $(`td[id^="ix${ix}-lno"]`).addClass("line_no_visible");
  }
  else {
    $(`td[id^="ix${ix}-lno"]`).removeClass("line_no_visible");
  }
}

function updateHighlightingAll() {
  $('tr[id^="ix"]').each(function () {
    updateHighlighting(this.id.split("-")[0].slice(2));
  });
}

function updateCheckboxes(checkbox) {
  const [other1, other2] = ["he-checkbox", "tl-checkbox", "en-checkbox"].filter((id) => id != checkbox.id);
  if (checkbox.checked) {
    $(`tr[id$="tr${checkbox.id.slice(0,2)}"]`).removeClass("hidden");
    $(`td[id$="${checkbox.id.slice(0,2)}td"]`).removeClass("hidden");
    $(`#${other1}`).removeAttr("disabled");
    $(`#${other2}`).removeAttr("disabled");
  }
  else {
    if (pr["format"] == "blocks") {
      $(`tr[id$="tr${checkbox.id.slice(0,2)}"]`).addClass("hidden");
    }
    $(`td[id$="${checkbox.id.slice(0,2)}td"]`).addClass("hidden");
    const other1_checked = $(`#${other1}`).is(":checked");
    const other2_checked = $(`#${other2}`).is(":checked");
    if (!other1_checked || !other2_checked) {
      if (other1_checked) { $(`#${other1}`).attr("disabled", true); }
      if (other2_checked) { $(`#${other2}`).attr("disabled", true); }
    }
  }
}

function updateURL() {
  let params = {"v": "", "he": "", "tl": "", "en": ""};
  if (made_a_choice) {
    params["v"] = current_choice;
  }
  if (!$('#he-checkbox').is(":checked")) {
    params["he"] = "0";
  }
  if (!$('#tl-checkbox').is(":checked")) {
    params["tl"] = "0";
  }
  if (!$('#en-checkbox').is(":checked")) {
    params["en"] = "0";
  }
  updateURLWithParams(params, true);
}

function updateURLWithParams(paramsToUpdate, doReplace) {
  const url = new URL(window.location);
  for (const [param, val] of Object.entries(paramsToUpdate)) {
    if (val != undefined && (!val.trim || val.trim() !== "")) {
      url.searchParams.set(param, val);
    }
    else {
      url.searchParams.delete(param);
    }
  }
  updateURLTo(url, doReplace);
}

function updateURLTo(newURL, doReplace) {
  if (doReplace) {
    console.log(Date.now() + " [replaced] " + newURL.searchParams);
    history.replaceState({}, "", newURL);
  }
  else {
    console.log(Date.now() + " [pushed] " + newURL.searchParams);
    history.pushState({}, "", newURL);
  }
}

window.onpopstate = function(e) {
  const url = new URL(window.location);
  console.log(Date.now() + " [popped] " + url.searchParams);
  setStateFromURL(e);
};

function setStateFromURL(e) {
  const urlParams = new URLSearchParams(window.location.search);
  setStateFromParams(urlParams, e);
}

function setStateFromParams(urlParams, e) {
  if (urlParams.has("v")) {
    current_choice = urlParams.get("v");
    update(urlParams.get("v"));
  }
  else {
    update("");
  }
  if (urlParams.has("he") && !parseInt(urlParams.get("he"))) {
    $('#he-checkbox').prop('checked', false);
    updateCheckboxes({ id: "he-checkbox", checked: false });
  }
  if (urlParams.has("tl") && !parseInt(urlParams.get("tl"))) {
    $('#tl-checkbox').prop('checked', false);
    updateCheckboxes({ id: "tl-checkbox", checked: false });
  }
  if (urlParams.has("en") && !parseInt(urlParams.get("en"))) {
    $('#en-checkbox').prop('checked', false);
    updateCheckboxes({ id: "en-checkbox", checked: false });
  }
}

$(document).ready(function () {
  // Add options and set widths of selects
  for (let i = 0; i < choices.length; i++) {
    $(`#cs${i}`).empty();
    for (const ch of pr["choices"][choices[i]]) {
      $(`#cs${i}`).append($('<option>').text(ch[1]));
    }
    const width = $(`#cs${i}`).width() + 30;
    $(`#cc${i}`).attr("style", `width: ${width}px;`);
    $(`#cs${i}`).attr("style", `width: ${width}px;`);
  }
  if ("presets" in pr) {
    for (let j = 0; j < pr["presets"].length; j++) {
      let opt = $('<option>').text(pr["presets"][j][1])
                             .attr("value", j)
                             .attr("id", `csPo${j}`);
      $(`#csP`).append(opt);
    }
    const width = $(`#csP`).width() + 30;
    $(`#ccP`).attr("style", `width: ${width}px;`);
    $(`#csP`).attr("style", `width: ${width}px;`);
  }
  // Initalize everything dependent on choices
  setStateFromURL();
  // Add highlight functionality
  $('tr[id^="ix"]').each(function () {
    $(this).mouseenter(() => updateHighlighting(this.id.split("-")[0].slice(2)));
    $(this).mouseleave(() => updateHighlighting(this.id.split("-")[0].slice(2)));
  });
  $('span[id^="ix"]').each(function () {
    $(this).mouseenter(() => updateHighlighting(this.id.split("-")[0].slice(2)));
    $(this).mouseleave(() => updateHighlighting(this.id.split("-")[0].slice(2)));
  });
  // Add functionality to selects
  $('select[id^="cs"]').change(function () {
    const [[_full_match, i]] = [...this.id.matchAll(/cs(.)/g)];
    if (i === "P") {
      let choice = "";
      for (let i = 0; i < choices.length; i++) {
        const ch = pr["presets"][this.value][0][i];
        choice += ch === "." ? current_choice[i] : ch;
      }
      update(choice);
    }
    else {
      update(current_choice.slice(0,i) + this.value + current_choice.slice(parseInt(i)+1));
    }
    updateURL();
  });
  // Add functionality to checkboxes
  $('#dark-checkbox').change(function () {
    if ($('#dark-checkbox').is(":checked")) {
      $('body').addClass("dark-mode");
    }
    else {
      $('body').removeClass("dark-mode");
    }
    updateHighlightingAll();
  });
  $('#he-checkbox').change(function () { updateCheckboxes(this); updateURL(); });
  $('#tl-checkbox').change(function () { updateCheckboxes(this); updateURL(); });
  $('#en-checkbox').change(function () { updateCheckboxes(this); updateURL(); });
  $('#color-checkbox').change(function () { updateHighlightingAll(); });
});
