function mapFilter(xs, f) {
    return xs.map(f).filter(function(x) {return x});
}

// Given list a of primitive items, returns it with duplicates removed.
function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}
