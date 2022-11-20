
const choices = Object.keys("choices" in pr ? pr["choices"] : {});

var current_choice = ""; // this gets set to a string of length `choices.length` after update()
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
  console.log("Updating to: " + choice + " | Result: " + current_choice);
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

function updateHighlighting(ix) {
  const trs_hover = $(`tr[id^="ix${ix}-tr"]`).filter(function () { return $(this).is(":hover"); })
  if ($('#color-checkbox').is(":checked") || trs_hover.length > 0) {
    const spans_hover = $(`span[id^="ix${ix}-"]`).filter(function () { return $(this).is(":hover"); })
    const alpha = spans_hover.length == 0 ? 1.0 : 1/3;
    const hover_j = spans_hover.length == 0 ? null : spans_hover[0].id.split("-")[2];
    $(`span[id^="ix${ix}-"]`).addClass("highlighted").each(function () {
      const j = this.id.split("-")[2];
      const this_alpha = j === hover_j ? 1.0 : alpha;
      $(this).css("background-color", colors[ix+"-"+j].replace(/, [^),]+\)/g, `, ${this_alpha})`));
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

function updateCheckboxes(checkbox) {
  const [other1, other2] = ["he-checkbox", "tl-checkbox", "en-checkbox"].filter((id) => id != checkbox.id);
  if (checkbox.checked) {
    $(`td[id$="${checkbox.id.slice(0,2)}td"]`).removeClass("hidden");
    $(`#${other1}`).removeAttr("disabled");
    $(`#${other2}`).removeAttr("disabled");
  }
  else {
    $(`td[id$="${checkbox.id.slice(0,2)}td"]`).addClass("hidden");
    const other1_checked = $(`#${other1}`).is(":checked");
    const other2_checked = $(`#${other2}`).is(":checked");
    if (!other1_checked || !other2_checked) {
      if (other1_checked) { $(`#${other1}`).attr("disabled", true); }
      if (other2_checked) { $(`#${other2}`).attr("disabled", true); }
    }
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
  update("");
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
  });
  // Add functionality to checkboxes
  $('#he-checkbox').change(function () { updateCheckboxes(this); });
  $('#tl-checkbox').change(function () { updateCheckboxes(this); });
  $('#en-checkbox').change(function () { updateCheckboxes(this); });
  $('#color-checkbox').change(function () {
    $('tr[id^="ix"]').each(function () {
      updateHighlighting(this.id.split("-")[0].slice(2));
    });
  });
});
