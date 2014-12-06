function depunctuateWord(rword) {
    // only strip leading/trailing single quotes
    return rword.replace(/[!"#$%&\\\(\)*+,-.\/:;<=>?@\[\]\^_`{|}~]/g, "").replace(/^'/, "").replace(/'$/, "");
}

function cleanWord(rword) {
    return depunctuateWord(rword).toLowerCase();
}

function wordStrokes(word) {
    var r = rdata[cleanWord(word)];
    return r ? r : [];
}

function bestStroke(strokes) {
    var cand;
    $.each(strokes, function(i, s) {
            cand = take_best(cand, s);
            });
    return cand;
}

// todo: ability to reverse array
function stenoArray(steno) {
    var left = getLeftLettersFromSteno(steno);
    var right = getRightLettersFromSteno(steno);
    var r = [];
    $.each(["S","T","K","P","W","H","R"], function(i,l) { r.push(left.contains(l)); });
    $.each(["A", "O", "*", "E", "U"], function(i,l) { r.push(steno.contains(l)); });
    $.each(["F","R","P","B","L","G","T","S","D","Z"], function(i,l) { r.push(right.contains(l)); } );
    return r;
}

// Given to steno strokes, picks the 'better' one. We base this
// mostly on stroke size.
// TODO: have an expert look at this!
function take_best(s1, s2) {
    if (!s1) return s2;
    if (/\d/.test(s1)) { return s2; }
    if (/\d/.test(s2)) { return s1; }
    var l1 = s1.split("/").length;
    var l2 = s2.split("/").length;
    if (l1 < l2) { return s1; }
    else if (l2 < l1) { return s2; }
    // TODO: This doesn't make sense if we're not vowelizing
    if (s1.indexOf('*') == -1 && s2.indexOf('*') != -1) { return s1; }
    if (s2.indexOf('*') == -1 && s1.indexOf('*') != -1) { return s2; }
    if (s1.length < s2.length) { return s1; }
    if (s2.length < s1.length) { return s2; }
    return s1;
}
