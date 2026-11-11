"""Mobile CSS breakpoint smoke tests (no external CDN or local network required).
Run: python tests/mobile_layout.py ; requires playwright + Chromium.
"""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'assets/site.css').read_text()
HTML = '''<div id="root"><div class="app-shell">
  <header class="topbar">
    <div class="brand"><div class="flag"></div><div class="brand-top">THE ULTIMATE HIGH GROUND</div></div>
    <div class="resources"></div><div class="mobile-meta"><span>₦100B</span><span>80% SUPPORT</span><span>Q1/40</span></div>
    <button class="fullscreen-toggle">⛶</button><div class="timecontrols"><div class="transport"><button>||</button><button>1x</button><button>2x</button><button class="advance">↪</button></div></div>
  </header>
  <main class="game-stage">
    <div class="workbench-toolbar"><div class="toolbar-top"><div class="top-quick-actions"><button>MISSIONS</button><button>ORBITS</button><button>LABELS</button><button>LAYERS</button></div></div>
      <div class="preset-row"><button class="preset">War Room 3D</button><button class="preset">Orbit View</button></div></div>
    <aside class="dossier panel">ASSET DOSSIER</aside><section class="mission-control panel">MISSION CONTROL</section>
    <section class="firstlight-guide"><div class="firstlight-top">OPERATION FIRST LIGHT</div><h2>Inspect the Delta</h2><p>Choose a strategic response</p><div class="firstlight-actions"><button class="primary">Focus Delta</button></div></section>
    <div class="scene-bottom"><div class="zoom-buttons"><button>+</button><button>-</button></div></div>
    <nav class="mobile-bottom-nav"><button>MAP</button><button>ASSETS</button><button>MISSIONS</button><button>ORBIT</button><button>LAYERS</button></nav>
  </main></div></div><div class="rotate-device"><div class="rotate-device-content">Rotate</div></div>'''

def metric(page, selector, prop):
    return page.locator(selector).evaluate('(el,p)=>getComputedStyle(el)[p]', prop)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=shutil.which("chromium") or shutil.which("google-chrome"))
    for width, height, landscape in ((844,390,True),(667,375,True),(390,844,False)):
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=2)
        page.set_content(f'<meta name="viewport" content="width=device-width,initial-scale=1"><style>{CSS}</style>{HTML}')
        assert page.evaluate('matchMedia("(pointer: coarse)").matches'), 'Touch media query not enabled'
        nav=metric(page,'.mobile-bottom-nav','display')
        prompt=metric(page,'.rotate-device','display')
        full=metric(page,'.fullscreen-toggle','display')
        assert nav=='flex' and full=='flex', (width,height,nav,full)
        assert (prompt=='none') == landscape, (width,height,prompt)
        assert page.locator('.mobile-bottom-nav').bounding_box()['height'] >= 45
        if landscape:
            assert 50 <= page.locator('.topbar').bounding_box()['height'] <= 58
            assert metric(page,'.mission-control','transform')=='none', 'Mission overlay remains centred over mobile map'
            assert page.locator('.mission-control').bounding_box()['width'] < width*.65
            assert page.locator('.mobile-meta').is_visible(), 'Key metrics hidden on landscape phone'
            assert page.locator('.dossier').bounding_box()['x'] > width*.45
            tutorial=page.locator('.firstlight-guide').bounding_box()
            assert tutorial['x'] >= -1 and tutorial['x']+tutorial['width'] <= width+1
            assert tutorial['y'] >= 0 and tutorial['y']+tutorial['height'] <= height+1
        else:
            assert page.locator('.rotate-device').is_visible()
        print(f'PASS: {width}x{height} {"landscape" if landscape else "portrait"} mobile layout')
        page.close()
    browser.close()
