// ----------------------------------------------------------------------------
// Dictionary initialization
var rdata = {};

/*
// Code for Plover style dictionary
$.getJSON("dict.json", function(dict) {
        $.each( dict, function(k,rv) {
            if (/\d/.test(k)) return;
            var v = rv.toLowerCase();
            if (rdata.hasOwnProperty(v)) { // watch
                rdata[v].push({stroke: k});
            } else {
                rdata[v] = [{stroke: k}];
            }
            });
        init();
        });
        */

$(function() {
    $.getJSON("categorized.json", function(dict) {
            $.each( dict, function(i,e) {
                var k = e[1];
                var rv = e[0];
                var cat = e[2];
                if (/\d/.test(k)) return;
                var v = rv.toLowerCase();
                var stroke = {stroke: k, category: cat.split(" ")}
                if (rdata.hasOwnProperty(v)) { // watch
                    rdata[v].push(stroke);
                } else {
                    rdata[v] = [stroke];
                }
                });
            init();
            });
});

function filterDifficultyOnlyGood(stroke_entry) {
    if ($.inArray("misstroke", stroke_entry.category) != -1) return false;
    return filterDifficulty(stroke_entry);
}

function filterDifficulty(stroke_entry) {
    var stroke = stroke_entry.stroke;
    // handle the filters first
    if (!$("#enable-briefs").prop("checked") && $.inArray("brief", stroke_entry.category) != -1) {
        return false;
    }
    if (!$("#enable-misstrokes").prop("checked") && $.inArray("misstroke", stroke_entry.category) != -1) {
        return false;
    }
    if (!$("#enable-asterisk").prop("checked") && stroke.contains("*")) {
        return false;
    }
    if (!$("#enable-multistroke").prop("checked") && stroke.contains("/")) {
        return false;
    }
    var strokes = stroke.split("/");
    var r = [];
    for (var i = 0; i < strokes.length; i++) {
        var leftLetters = "", rightLetters = "", middleLetters = "";
        if ($("#enable-left").prop("checked")) {
            leftLetters = getLeftLettersFromSteno(strokes[i]);
        }
        if ($("#enable-left-vowels").prop("checked") || $("#enable-right-vowels").prop("checked") ) {
            middleLetters = getMiddleLettersFromSteno(strokes[i]);
            if (!$("#enable-left-vowels").prop("checked") && middleLetters.match(/[AO]/)) {
                return false;
            }
            if (!$("#enable-right-vowels").prop("checked") && middleLetters.match(/[EU]/)) {
                return false;
            }
        } else {
            if (strokes[i].contains("*")) middleLetters = "*";
        }
        if ($("#enable-right").prop("checked")) {
            rightLetters = getRightLettersFromSteno(strokes[i]);
        }
        if (middleLetters.length == 0 && rightLetters.length > 0) {
            middleLetters = "-";
        }
        var seg = leftLetters + middleLetters + rightLetters;
        if (!seg) return;
        r.push(seg);
    }
    return r.join("/");
    //var steno = stroke.split('/')[0];
}
// TODO: lift "chordifying" code from https://plover.goeswhere.com/
// so we can get per-chord stats

// ----------------------------------------------------------------------------
// Main user interface

// Data (namely wordlist) associated with the current exercise.
// data[cur_line] = { index: int, words: list by cur_word of word entries }
// See mkExerciseWord for all data associated with a word entry.
// The index is used to easily calculate WPM.
var data;
// Index of the current line.
var cur_line;
// Index of the current word in the current line.
var cur_word;
// If the word requires multiple strokes, which stroke are we on?
// 1-indexed.
var currentStroke = 1;
// What is the current mode? Valid values: "accuracy" (require correct
// stroke) and "speed" (advance on misstroke)
var cur_mode;
// What ist he current style? Valid values: "script", "randomized"
var cur_style;
// What time did we present this stroke to the user?
var stroke_start;
// What time did we start the exercise? (e.g. for WPM calculation)
var exercise_start;
// What is the current number of consecutive correct answers that have
// been made?
var streak = 0;
// What is the longest number of consecutive correct answers that have
// been made this drill?
var best_streak = 0;
// What is the total number of misstrokes that have been made this
// drill?
var misstrokes = 0;
// Are we done with the drill?
var finished = false;
// Did we misstroke on the current word?
// Always FALSE if we're "Advance on misstroke", since
// the word we misstroked on was the previous one after
// advancement!
var cur_misstroke = false;
// Did we misstroke the previous word?
var prev_misstroke = false;
// How many times have we attempted to stroke this word?
// On "Advance on misstroke" this is always zero.
var tries = 0;
// Recorded samples. We won't commit them to the database
// until the exercise finishes.
var samples = [];
// Target stroke time, in ms
var target_latency = parseInt(docCookies.getItem("target_latency"));
var metadata = "";

// IndexedDb to store sample data
var db;
var db_version = 3;

var request = indexedDB.open("stenomatic", db_version);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    db.createObjectStore("runs", { keyPath: "time" });
}
request.onsuccess = function(e) {
    db = e.target.result;
}

// TODO: Maybe change these semantics on account of deletion.

function updateMode() {
    cur_mode = $('input[name=mode]:checked', '#modebtns').val();
}

function updateDifficulty() {
    // cur_difficulty = [$("#enable-vowels").val(), $("#enable-left").val(), $("#enable-right").val(), $("#enable-asterisk").val()];
}

function updateStyle() {
    cur_style = $('input[name=style]:checked', '#stylebtns').val();
}

function updateBarometer() {
    var wpm;
    if (exercise_start) {
        wpm = Math.round((1000 * 60 * (data[cur_line].index + cur_word)) / ((new Date()).getTime() - exercise_start.getTime()));
    } else {
        wpm = NaN;
    }
    if (wpm > 300) { wpm = 300; }
    // ToDo: WPM is not really right, but doing it this way
    // so that the easier difficulty modes are not completely
    // bogus
    $('#barometer').html("[" + (cur_line + 1) + "/" + data.length + "] <strong>WPM:</strong> " + wpm + ", <strong>Streak:</strong> " + streak + " (best: " + best_streak + "), <strong>Misstrokes:</strong> " + misstrokes);
}

// hmm, I don't know what to actually do with this data
function addSample(actual, expected) {
    var cur_time = new Date().getTime();
    updateBarometer();
    if (!stroke_start || !exercise_start) return; // discard first data
    var record = {
        time: cur_time, // primary key
        diff: cur_time - stroke_start.getTime(),
        actual: actual,
        expected: expected,
        progress: data[cur_line].index + cur_word,
        cur_line: cur_line,
        cur_word: cur_word,
        tries: tries,
        // correct: actual == expected, (can derive)
        prev_misstroke: prev_misstroke
    };
    samples.push(record);
}

// PRESERVE UNDO by doing it directly
function setData(val) {
    $("#data").get(0).value = val;
}

function init() {
    $("textarea", "#samples").each(function() {
            $("#select-sample").append($("<option>").prop("value", $(this).prop("id")).text($(this).prop("name")));
            });
    $("#select-sample").change(function(e) {
            var t = $(document.getElementById($("#select-sample").val()));
            setData(t.val());
            });
    $("#txtInput").val(""); // force empty
    $("#loadbtn").click(loadData);
    $("#loadbtn2").click(loadData);
    $("#clearbtn").click(function() {setData("")});
    $("#txtInput").keyup(keyUp).keydown(keyDown);
    $("#prevbtn").click(function() {
            if (cur_line == 0) {
                cur_word = -1;
                $.each(data[cur_line].words, function(j,word_entry) {
                        word_entry.status = S_PENDING;
                    });
                //paintLine();
                nextWord();
                return;
            }
            var i = 1;
            var old_cur_line = cur_line;
            while (cur_line >= old_cur_line && cur_line - i >= 0) {
                cur_line -= i;
                $.each(data[cur_line].words, function(j,word_entry) {
                        word_entry.status = S_PENDING;
                    });
                cur_word = -1;
                //paintLine();
                nextWord();
                i++;
            }
        });
    $("#nextbtn").click(function() {
        if (cur_line == data.length - 1) return;
        cur_line++;
        cur_word = -1;
        //paintLine();
        nextWord();
        });
    $("#dumpbtn").click(function () {
        function stenoHeader(prefix) {
            return STENO_ORDER.map(function(s) {
                if (s == "*") s = "_asterisk";
                else if (s.indexOf("-") == 0) s = s.replace(/-/, "_r");
                else s = "_l" + s;
                return prefix + s
            });
        }
        var r = ["time,diff,tries,correct,prev,progress,line,word," + stenoHeader("actual") + "," + stenoHeader("expected")];
        db.transaction(["runs"], "readonly")
          .objectStore("runs")
          .openCursor().onsuccess = function(e) {
              var c = e.target.result;
              if (c) {
                  c.value.samples.forEach(function(s) {
                      var row = [s.time,s.diff,s.tries,s.actual == s.expected | 0,s.prev_misstroke | 0,s.progress,s.cur_line,s.cur_word];
                      // boneheaded
                      row = row.concat(stenoArray(s.actual).map(Number));
                      row = row.concat(stenoArray(s.expected).map(Number));
                      r.push(row.join(","));
                  });
                  c.continue();
              } else {
                  $("#analytics").val(r.join("\n"));
              }
          }
    });
    updateDrive();
    loadData();
    updateMode();
}
function updateDrive() {
    if ($("#drive-url").val()) {
        // TODO
    }
}

var S_PENDING = 0;
var S_INCORRECT = 1;
var S_DONE = 2;
function copyExerciseWord(word_entry) {
    return {word: word_entry.word,
        strokes: word_entry.strokes,
        goodStrokes: word_entry.goodStrokes,
        bestStroke: word_entry.bestStroke,
        bestStrokeArray: word_entry.bestStrokeArray,
        recognized: word_entry.recognized,
        user: word_entry.user.slice(0),
        status: word_entry.status
    }
}
function mkExerciseWord(word, strokes, good_strokes, recognized) {
    var best_stroke = good_strokes.length ? bestStroke(good_strokes) : undefined;
    return {word: word,
        strokes: strokes,
        goodStrokes: good_strokes,
        bestStroke: best_stroke,
        bestStrokeArray: best_stroke ? stenoArray(best_stroke) : undefined,
        recognized: recognized,
        user: [], // what you stroked in
        status: S_PENDING};
}
function inputExerciseWord(format, word) {
    if (!/\S/.test(word)) return null;
    if (format == "#standard") {
        var strokes = wordStrokes(word);
        var t_strokes = mapFilter(strokes, filterDifficulty);
        var good_strokes = mapFilter(strokes, filterDifficultyOnlyGood);
        return mkExerciseWord(word, t_strokes, good_strokes, !!strokes.length);
    } else if (format == "#raw-right") {
        return mkExerciseWord(word, ["-" + word], ["-" + word], true);
    } else if (format == "#raw") {
        return mkExerciseWord(word, [word], [word], true);
    }
}
function getCurrentWord() {
    return data[cur_line].words[cur_word];
}
function loadData() {
    data = [];
    metadata = "";
    var text = $("#data").val();
    var lines = text.split("\n");
    var c = 0;
    var format = "#standard";
    updateStyle();
    updateDifficulty();
    if (cur_style == "script") {
        lines.forEach(function(line) {
            if (line[0] == "#") {
                format = line;
                metadata += line + "\n";
                return;
            }
            var cur = [];
            var sub_c = 0;
            line.split(" ").forEach(function(word) {
                var e = inputExerciseWord(format, word);
                if (e) {
                    if (e.goodStrokes.length) {
                        sub_c++;
                    }
                    cur.push(e);
                }
            });
            data.push({index: c, orig: line, words: cur});
            c += sub_c;
            });
    } else if (cur_style == "randomized") {
        var count = parseInt($("#randomLength").val());
        var corpus = [];
        lines.forEach(function(line) {
            if (line[0] == "#") {
                format = line;
                metadata += line + "\n";
                return;
            }
            line.split(" ").forEach(function(rword) {
                // depunctuate for random drills, so a
                // transcript: 'He said "Boo!"'
                // turns into ['He', 'said', 'Boo']
                var word = depunctuateWord(rword);
                var e = inputExerciseWord(format, word);
                if (e && e.goodStrokes.length) {
                    corpus.push(e);
                }
            });
        });
        if (!corpus.length) {
            $("#viewport").html("<em>No data</em>");
            return;
        }
        // Make me a Markov chain
        $.each(corpus, function(i1,e1) {
            if ($("#randomShift").is(':checked')) {
                var scores = [];
                $.each(corpus, function(i2,e2) {
                        // TODO refactor out acceptability function
                        var score = 0;
                        for (var k = 0; k < e1.bestStrokeArray.length; k++) {
                            if (e1.bestStrokeArray[k] == 1 && e2.bestStrokeArray[k] == 1) score++;
                        }
                        if (!scores[score]) scores[score] = [];
                        scores[score].push(e2);
                    });
                for (var j = 0; j < scores.length; j++) {
                    if (scores[j].length) {
                        e1.transitions = scores[j];
                        break;
                    }
                }
                if (!e1.transitions || !e1.transitions.length) {
                    e1.transitions = corpus;
                }
            } else {
                e1.transitions = corpus;
            }
            });
        var cur = [];
        var transitions = corpus;
        for (var i = 0; i < count; i++) {
            if (i % 8 == 0) {
                cur = [];
                data.push({index: i, words: cur});
            }
            var cand = transitions[Math.floor(Math.random() * transitions.length)];
            cur.push(copyExerciseWord(cand));
            transitions = cand.transitions;
        }
    }
    if (data.length) startData();
}
function startData() {
    cur_line = 0;
    cur_word = -1;
    exercise_start = false;
    streak = 0;
    best_streak = 0;
    misstrokes = 0;
    stroke_start = false;
    $("#txtInput").removeClass("complete");
    $("#txtInput").prop("disabled", false);
    $("#prevbtn").prop("disabled", false);
    $("#nextbtn").prop("disabled", false);
    $("#controls").css("display", "none");
    finished = false;
    $('#stats').html("");
    $('#barometer').html("");
    paintExercise();
    //paintLine();
    nextWord();
}
/*
function paintLine() {
    var v = $("#viewport");
    v.html('');
    $.each(data[cur_line].words, function (i, word_entry) {
            var word = word_entry.word;
            var elem = word_entry.elem ? word_entry.elem : $("<span>");
            word_entry.elem = elem;
            elem.text(word);
            paintWord(word_entry);
            v.append(elem);
            v.append(document.createTextNode(" "));
    });
}
*/
function paintExercise() {
    var v = $("#viewport");
    v.html('');
    data.forEach(function(l) {
        var div = $("<div>");
        v.append(div);
        var flag = false;
        l.words.forEach(function(word_entry) {
            var word = word_entry.word;
            var elem = word_entry.elem ? word_entry.elem : $("<span>");
            word_entry.elem = elem;
            elem.text(word);
            paintWord(word_entry);
            div.append(elem);
            div.append(document.createTextNode(" "));
            flag = true;
        });
        if (!flag) div.append("&nbsp;");
    });
}
function prevWord() {
    var repaint_line = false;
    var first = true;
    while (cur_line >= 0 || cur_word >= 0) {
        var word_entry = getCurrentWord();
        word_entry.status = S_PENDING;
        paintWord(word_entry);
        if (!first && word_entry.recognized && word_entry.goodStrokes.length) break;
        if (cur_line == 0 && cur_word == 0) break;
        if (cur_word == 0) {
            repaint_line = true;
            cur_line--;
            cur_word = data[cur_line].words.length - 1;
        } else {
            cur_word--;
        }
        var first = false;
    }
    if (repaint_line) {
        //paintLine();
    }
    setupWord();
}
function nextWord(misstroke) {
    currentStroke = 1;
    answerGivenSoFar = "";
    $("#txtInput").val("");
    $("#prompt").text("");
    if (cur_word >= 0) {
        var word_entry = getCurrentWord();
        if (misstroke) {
            word_entry.status = S_INCORRECT;
        } else {
            word_entry.status = S_DONE;
        }
        paintWord(word_entry);
    }
    if (cur_word < data[cur_line].words.length - 1) {
        cur_word++;
    } else if (cur_line < data.length - 1) {
        cur_word = -1;
        cur_line++;
        //paintLine();
        return nextWord();
    } else {
        // done
        finishExercise();
        return;
    }
    var el = getCurrentWord().elem;
    var container = $("#viewport");
    container.animate({
        scrollTop: el.offset().top - container.offset().top + container.scrollTop()
            });
    setupWord();
}

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

function diffSteno(actual, expected) {
    if (!actual) { // success we don't record
        return expected;
    }
    var actual_left = getLeftLettersFromSteno(actual);
    var expected_left = getLeftLettersFromSteno(expected);
    var actual_middle = getMiddleLettersFromSteno(actual);
    var expected_middle = getMiddleLettersFromSteno(expected);
    var actual_right = getRightLettersFromSteno(actual);
    var expected_right = getRightLettersFromSteno(expected);
    var r = "";
    function handler(a, e) {
        return function(i,l) {
            if (a.contains(l) && e.contains(l)) {
                r += l;
            } else if (!a.contains(l) && !e.contains(l)) {
            } else if (a.contains(l) && !e.contains(l)) {
                r += "<sub>" + l + "</sub>";
            } else if (!a.contains(l) && e.contains(l)) {
                r += "<sup>" + l + "</sup>";
            }
        }
    }
    $.each(["S","T","K","P","W","H","R"], handler(actual_left, expected_left));
    var old_r = r;
    $.each(["A", "O", "*", "E", "U"], handler(actual_middle, expected_middle));
    if (old_r == r) r += "-";
    $.each(["F","R","P","B","L","G","T","S","D","Z"], handler(actual_right, expected_right));
    return $("<span>").addClass("diff").html(r);
}

function finishExercise() {
    $("#txtInput").addClass("complete");
    $("#txtInput").prop("disabled", true);
    $("#prevbtn").prop("disabled", true);
    $("#nextbtn").prop("disabled", true);
    $("#controls").css("display", "inherit");
    finished = true;
    // commit to database
    db.transaction(["runs"], "readwrite")
      .objectStore("runs")
      .put({time: exercise_start.getTime(), samples: samples});
    // run some quick stats
    var v = $("#viewport");
    var population = [];
    v.html("");
    data.forEach(function(line) {
        var d = $("<div class='many'>");
        line.words.forEach(function(word) {
            var span = $("<span class='unit'>");
            span.html(word.elem);
            word.elem.removeClass("done");
            d3.selectAll(span.get()).data([word]);
            d.append(span);
            d.append(document.createTextNode(" "));
            // infinity for error?! time loss good enough
            if (word.time) population.push(word.time);
            });
        v.append(d);
        });
    // TODO setting the on handlers here is silly....
    population.sort(function(a,b){return a - b});
    var bgcolor = d3.scale.threshold().range(["#FFF", "#A00"]);
    var fgcolor = d3.scale.threshold().range(["#000", "#FFF"]);
    var units = d3.selectAll(v.get()).selectAll(".unit");
    var slider = $("#controls-slider");
    var slider_ms = $("#controls-ms");
    var slider_wpm = $("#controls-wpm");
    var mistakes = $("#controls-mistakes").unbind('change').on("change", updateUnits);
    slider.attr("max", population.length-1);
    slider.attr("value", d3.bisectLeft(population, target_latency));
    function mistakeP(d) {
        return d.user.length > 1 && mistakes.prop("checked");
    }
    function updateUnits() {
        target_latency = population[parseInt(slider.val())];
        docCookies.setItem("target_latency", target_latency, Infinity);
        target_wpm = Math.floor((60 * 1000) / target_latency);
        slider_ms.val(target_latency);
        slider_wpm.val(target_wpm);
        bgcolor.domain([target_latency]);
        fgcolor.domain([target_latency]);
        units
            .style("background-color", function(d) { return mistakeP(d) ? "#000" : bgcolor(d.time); })
            .style("color", function(d) { return mistakeP(d) ? "#FFF" : fgcolor(d.time); })
    }
    updateUnits();
    slider.unbind("input").on("input", updateUnits);
    $("#controls-retry-words").unbind('click').click(function () {
        var split_at = 10;
        var new_line = [];
        var new_lines = [new_line];
        units.each(function(d) {
            if (mistakeP(d) || d.time >= target_latency) {
                new_line.push(depunctuateWord(d.word));
                if (new_line.length >= 10) {
                    new_line = [];
                    new_lines.push(new_line);
                }
            }
        });
        setData(metadata + "\n" + new_lines.map(function(l) {return l.join(" ")}).join("\n"));
        loadData();
    });
    $("#controls-retry-lines").unbind('click').click(function () {
        var new_lines = [];
        data.forEach(function(l) {
            if (l.words.some(function(d) {
                return mistakeP(d) || d.time >= target_latency;
            })) {
                if (l.orig) {
                    new_lines.push(l.orig);
                } else {
                    new_lines.push(l.words.map(function (d) {return d.word;}).join(" "));
                }
            }
        });
        setData(metadata + "\n" + new_lines.join("\n"));
        loadData();
    });
}

function setupWord() {
    var word_entry = getCurrentWord();
    var word = word_entry.word;
    if (!word_entry.goodStrokes.length) {
        return nextWord();
    }
    function strokeCompare(a,b) {
        return a.split("/").length - b.split("/").length;
    }
    function mungeStrokes(strokes) {
        return uniq(strokes).sort(strokeCompare).join(",");
    }
    currentDrillItem = {
        "Text": word,
        "GoodValue": mungeStrokes(word_entry.goodStrokes),
        "Value": mungeStrokes(word_entry.strokes),
    }
    paintWord(word_entry);
    word_entry.elem.addClass("current");
    if (cur_line != 0 || cur_word != 0) {
        stroke_start = new Date();
    }
    tries = 0;
    prev_misstroke = cur_misstroke;
    cur_misstroke = false;
}

function paintWord(word_entry) {
    var elem = word_entry.elem;
    elem.removeClass();
    if (!word_entry.recognized) {
        elem.addClass("nostroke");
    } else if (word_entry.status == S_DONE) {
        elem.addClass("done");
    } else if (word_entry.status == S_INCORRECT) {
        elem.addClass("incorrect");
    }
    // TODO: Add other colors which "hint" that the word is funny, e.g. if it is a brief
}

// ----------------------------------------------------------------------------
// QWERTY Steno support code

// Some of this code is pure, some relies on global state.
// Here are the variable declarations of the global state relied upon:

function showAnswerPrompt(steno) {
    streak = 0;
    if (!stroke_start) {
        // first one's free.
        stroke_start = new Date();
        return;
    }
    cur_misstroke = true;
    var we = getCurrentWord();
    we.user.push(steno);
    var cands = currentDrillItem.
        GoodValue.
        split(",").
        filter(function(v){return v.indexOf(answerGivenSoFar) == 0}).
        map(function(v) {return v.substring(answerGivenSoFar.length)});
    // PROBLEM: want to figure out what LIKELY candidate was; i.e.
    // rather than best_cand, you might want candidate with MINIMAL
    // DISTANCE
    var best_cand = bestStroke(cands);
    addSample(steno, best_cand);
    tries++;
    misstrokes++;
    if (cur_mode == "speed") {
        nextWord(true);
    }
    $("#prompt").text(best_cand + ", you did " + steno);
}
function setStenoKeyboardPressedKeys() {}
function clearStenoKeyboardPressed() {}
function hideAnswerPrompt() {}
function showWpm() {}
function setNextDrillItem(steno) {
    addSample(steno, steno);
    if (!exercise_start) exercise_start = new Date();
    var we = getCurrentWord();
    we.user.push(steno);
    if (!stroke_start) stroke_start = new Date();
    we.time = (new Date()).getTime() - stroke_start.getTime();
    streak++;
    if (streak > best_streak) best_streak = streak;
    nextWord();
}
function possibleAnswerClick() {
}
function showDrillItem() {}
