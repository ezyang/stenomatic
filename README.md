The Stenomatic 9000
===================

Usage
-----

The Stenomatic 9000 is an application for drilling steno drills. I made
it because I wanted a drilling application with more knobs than most of
the existing applications had.  Eventually, it might grow into a
non-gameified version of many of the minigames imagined in
http://plover.stenoknight.com/2011/04/hover-plover.html

This is a self-contained, pure JavaScript application, so all you have
to do is clone it somewhere and load it up in your browser.  Most of the
features should be self-explanatory on the page, but if not, please
shout!

Not implemented yet
-------------------

    * MAXIMIZE CONFUSION.  Right now we have an optional simple Markov
      process which avoids similar words; we can furthermore
      try to force vowel to skip between left and right, force
      different finger and force contrary motion (one finger goes
      left while the other goes right; also same motion),
      using different probability distributions.

      Confusion is not good when there are only two choices (vowel)
      disable it in that case.

    * Markov generated random text based on the input corpus (Ha Ha)

    * Smooth scrolling, use
      http://stackoverflow.com/questions/2905867/how-to-scroll-to-specific-item-using-jquery

    * Custom dictionary support.

    * Colorized letters per word types see
      http://stenoknight.com/plover/ploverdemo/ploverdemo.html

    * Bring back the steno keyboard (toggleable, also how heavy
      hint should be given should be toggleable), BTW colorize
      it same as above!

    * Download your data, load it into R and do stats analysis
      on it. (Is this actually useful?)

    * Karaoke mode: take a cue file and do time trials. (Need to
      give user a grace period since the subfiles will not necessarily
      be the right place.) Use YOUTUBE to source music cheaply.

    * Time trial mode: karaoke mode but without the karaoke
      (Low priority, you can simulate this using a metronome).

    * Idea for rendering misstrokes: key heatmap.  Increase color
      depth if you keep stroking the key instead of the right
      one (which is highlighted in some way).  Benefit of this
      scheme: you can aggregate when stroking the same word
      multiple times.  Maybe more difficult if trying to aggregate
      per chord; maybe just split left/right/vowel.

Things which will be annoying to implement.

    * Fix stemmification/suffixization.  StenoLearner does this
      property but I can't stand waiting for its dictionary to
      load.  Maybe add some ad hoc rules to fix it.

Things which would be nice to implement, but which I don't know
how to spec.

    * Visual representation of how long it took to do words.  Heat map?
      Some sort of coloring?  Little bars?  Sizing?  Need to play
      around with a few options, what we have right now is NOT very good.

    * Per key/chord statistics.  We have a teensy bit of this in
      the post mortem code, unclear how to package this up in
      a better format.

    * Aggregated data: if you do the same test set multiple times,
      give some ability to track progress over time.  Preferably
      have some sort of server to store tests and your data, but
      this will be annoying to setup and maintain.  WPMs at bare
      minimum, also test data.

    * I'm pretty sure there is at least some hysterisis going on
      between previous and next stroke, but I don't know how
      to visualize this.  Musically it's like "intervals", but
      there are a lot more intervals.

Bugs
----

    * Partial strokes UI is pretty confusing.  Can we chunk up the
      words somehow to give partial progress?  Seems algorithmically tricky.
