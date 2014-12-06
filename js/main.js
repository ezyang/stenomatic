// ----------------------------------------------------------------------------
// Dictionary initialization
var rdata = {"i": ["EU"]};

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
// data is a list of {index: wordcount index, words: list of {word: word}}
var data, cur_line, cur_word;
var currentStroke = 1;
var cur_mode, cur_style;
var samples; // {time: Date, start_time: Date, expected_strokes: [String], actual_stroke: String, line: Number, word: Number}
var stroke_start, exercise_start;
var streak = 0;
var best_streak = 0;
var misstrokes = 0;
var finished = false;

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
    if (!exercise_start) {
        exercise_start = new Date();
    }
    var wpm = Math.round((1000 * 60 * (data[cur_line].index + cur_word)) / ((new Date()).getTime() - exercise_start.getTime()));
    if (wpm > 300) { wpm = 300; }
    // ToDo: WPM is not really right, but doing it this way
    // so that the easier difficulty modes are not completely
    // bogus
    $('#barometer').html("[" + (cur_line + 1) + "/" + data.length + "] <strong>WPM:</strong> " + wpm + ", <strong>Streak:</strong> " + streak + " (best: " + best_streak + "), <strong>Misstrokes:</strong> " + misstrokes);
}

// hmm, I don't know what to actually do with this data
function addSample(actual, expecteds) {
    /*
    samples.push({time: new Date(),
                  start_time: stroke_start,
                  actual_stroke: actual,
                  expected_strokes: expecteds,
                  line: cur_line,
                  word: cur_word});
                  */
    updateBarometer();
}

function init() {
    $("textarea", "#samples").each(function() {
            $("#select-sample").append($("<option>").prop("value", $(this).prop("id")).text($(this).prop("name")));
            });
    $("#select-sample").change(function(e) {
            var t = $(document.getElementById($("#select-sample").val()));
            $("#data").val(t.val());
            });
    $("#txtInput").val(""); // force empty
    $("#loadbtn").click(loadData);
    $("#loadbtn2").click(loadData);
    $("#clearbtn").click(function() {$("#data").val("")});
    $("#txtInput").keyup(keyUp).keydown(keyDown);
    $("#prevbtn").click(function() {
            if (cur_line == 0) {
                cur_word = -1;
                $.each(data[cur_line].words, function(j,word_entry) {
                        word_entry.status = S_PENDING;
                    });
                paintLine();
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
                paintLine();
                nextWord();
                i++;
            }
        });
    $("#nextbtn").click(function() {
        if (cur_line == data.length - 1) return;
        cur_line++;
        cur_word = -1;
        paintLine();
        nextWord();
        });
    $("#drive-url").val(docCookies.getItem("stenomatic-drive-url"));
    $("#drive-url").bind("propertychange change click keyup input paste", function () {
            docCookies.setItem("stenomatic-drive-url", $("#drive-url").val(), Infinity);
            updateDrive();
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
function getCurrentWord() {
    return data[cur_line].words[cur_word];
}
function loadData() {
    data = [];
    var text = $("#data").val();
    var lines = text.split("\n");
    var c = 0;
    updateStyle();
    updateDifficulty();
    if (cur_style == "script") {
        $.each( lines, function(i,line) {
                var cur = [];
                var sub_c = 0;
                var words = line.split(" ");
                $.each( words, function(i,word) {
                    if (/\S/.test(word)) {
                        var strokes = wordStrokes(word);
                        var t_strokes = mapFilter(strokes, filterDifficulty);
                        var good_strokes = mapFilter(strokes, filterDifficultyOnlyGood);
                        if (good_strokes) {
                            sub_c++;
                        }
                        cur.push(mkExerciseWord(word, t_strokes, good_strokes, !!strokes.length));
                    }
                    });
                if (cur.length > 0) data.push({index: c, words: cur});
                c += sub_c;
                });
    } else if (cur_style == "randomized") {
        var count = parseInt($("#randomLength").val());
        var corpus = [];
        $.each( lines, function(i,line) {
                var words = line.split(" ");
                $.each( words, function(i, rword) {
                    var word = depunctuateWord(rword);
                    var strokes = wordStrokes(word);
                    var t_strokes = mapFilter(strokes, filterDifficulty);
                    var good_strokes = mapFilter(strokes, filterDifficultyOnlyGood);
                    if (/\S/.test(word) && good_strokes.length) {
                        corpus.push(mkExerciseWord(word, t_strokes, good_strokes, true));
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
    samples = [];
    streak = 0;
    best_streak = 0;
    misstrokes = 0;
    stroke_start = false;
    $("#txtInput").removeClass("complete");
    $("#txtInput").prop("disabled", false);
    $("#prevbtn").prop("disabled", false);
    $("#nextbtn").prop("disabled", false);
    finished = false;
    $('#stats').html("");
    $('#barometer').html("");
    paintLine();
    nextWord();
}
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
        paintLine();
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
        paintLine();
        return nextWord();
    } else {
        // done
        finishExercise();
        return;
    }
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
    finished = true;
    // run some quick stats
    var errors = 0;
    var error_list = [];
    var v = $("#viewport");
    v.html("");
    $.each(data, function(i,line) {
            var d = $("<div class='many'>");
            $.each(line.words, function(j,word) {
                var cell = $("<table class='unit'>");
                cell.prop("title", word.user.join(", "))
                cell.append($("<tr>").html($("<td class='over'>").html(word.elem)));
                var annot = "";
                if (!word.recognized) {
                } else if (cur_mode == "speed") {
                    annot = diffSteno(word.user[word.user.length-1], word.bestStroke);
                } else if (cur_mode == "accuracy") {
                    // TODO: color code for victory
                    // two significant digits at all times
                    var time = word.time >= 1000 ? (Math.round(word.time / 100) / 10)
                                                 : (Math.round(word.time / 10) / 100);
                    annot += time;
                    if (word.user.length > 1) {
                        annot += "<sup class='errorCount'>(" + (word.user.length - 1) + ")</sup>"
                    }
                    annot = $("<span class='wordstat'>").html(annot);
                }
                cell.append($("<tr>").html($("<td class='under'>").html(annot)));
                d.append(cell);
                d.append(document.createTextNode(" "));
                if (word.status == S_INCORRECT) {
                    errors++;
                }
                });
            v.append(d);
            });
    $("#stats").html("<strong>Uncorrected errors:</strong> " + errors);
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
    misstrokes++;
    var we = getCurrentWord();
    we.user.push(steno);
    var cands = currentDrillItem.
        GoodValue.
        split(",").
        filter(function(v){return v.indexOf(answerGivenSoFar) == 0}).
        map(function(v) {return v.substring(answerGivenSoFar.length)});
    // PROBLEM: want to figure out what LIKELY candidate was
    addSample(steno, cands);
    if (cur_mode == "speed") {
        nextWord(true);
    }
    $("#prompt").text(bestStroke(cands) + ", you did " + steno);
}
function setStenoKeyboardPressedKeys() {}
function clearStenoKeyboardPressed() {}
function hideAnswerPrompt() {}
function showWpm() {}
function setNextDrillItem(steno) {
    addSample(steno, [steno]);
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
