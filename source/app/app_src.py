"""The UI source. app/ui/*.js are parts of one script: they are joined in the order listed in ui/ORDER
   and run inside a single function, so they share variables and are not valid JavaScript on their own."""
A = "/home/claude/app/"
TEST_HOOK = "window.__muster = {S:S, C:C, build:build, FORMATS:FORMATS};\n"
def app_js():
    names = open(A + "ui/ORDER").read().split()
    return "".join(open(A + "ui/" + n).read() for n in names)
def page_js():
    """What goes in the published page: the test hook is left out."""
    src = app_js(); assert TEST_HOOK in src
    return src.replace(TEST_HOOK, "")
