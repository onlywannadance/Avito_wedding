# -*- coding: utf-8 -*-
import re
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def load_map():
    """Build URL -> local path map from downloaded assets."""
    thumb_to_full = {
        'https://thb.tildacdn.com/tild6164-3162-4665-b264-633732393030/-/resize/20x/noroot.png': 'assets/images/noroot.png',
        'https://thb.tildacdn.com/tild3837-3736-4063-b234-383239643833/-/resize/20x/Group_248_1.png': 'assets/images/Group_248_1.png',
        'https://thb.tildacdn.com/tild6163-3366-4162-b131-616162626235/-/resize/20x/Group_28.png': 'assets/images/Group_28.png',
        'https://thb.tildacdn.com/tild3762-3266-4264-a538-313938383962/-/resize/20x/_7_1.png': 'assets/images/_7_1.png',
    }

    replacements = {
        'https://cdn.postnikovmd.com/tilda@1.5/mods.min.js': 'assets/js/mods.min.js',
        'https://neo.tildacdn.com/js/tilda-fallback-1.0.min.js': 'assets/js/tilda-fallback-1.0.min.js',
        'https://static.tildacdn.com/css/tilda-grid-3.0.min.css': 'assets/css/tilda-grid-3.0.min.css',
        'https://static.tildacdn.com/ws/project15229836/tilda-blocks-page143665736.min.css?t=1780217490': 'assets/css/tilda-blocks-page143665736.min.css',
        'https://static.tildacdn.com/css/tilda-animation-2.0.min.css': 'assets/css/tilda-animation-2.0.min.css',
        'https://static.tildacdn.com/css/tilda-forms-1.0.min.css': 'assets/css/tilda-forms-1.0.min.css',
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700': 'assets/css/google-fonts.css',
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&family=Montserrat:wght@100..900&subset=latin,cyrillic': 'assets/css/google-fonts.css',
        'https://static.tildacdn.com/js/tilda-polyfill-1.0.min.js': 'assets/js/tilda-polyfill-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-scripts-3.0.min.js': 'assets/js/tilda-scripts-3.0.min.js',
        'https://static.tildacdn.com/ws/project15229836/tilda-blocks-page143665736.min.js?t=1780217490': 'assets/js/tilda-blocks-page143665736.min.js',
        'https://static.tildacdn.com/js/tilda-lazyload-1.0.min.js': 'assets/js/tilda-lazyload-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-animation-2.0.min.js': 'assets/js/tilda-animation-2.0.min.js',
        'https://static.tildacdn.com/js/tilda-zero-1.1.min.js': 'assets/js/tilda-zero-1.1.min.js',
        'https://static.tildacdn.com/js/tilda-forms-1.0.min.js': 'assets/js/tilda-forms-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-zero-forms-1.0.min.js': 'assets/js/tilda-zero-forms-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-animation-sbs-1.0.min.js': 'assets/js/tilda-animation-sbs-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-zero-scale-1.0.min.js': 'assets/js/tilda-zero-scale-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-zero-fixed-1.0.min.js': 'assets/js/tilda-zero-fixed-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-events-1.0.min.js': 'assets/js/tilda-events-1.0.min.js',
        'https://static.tildacdn.com/css/tilda-date-picker-1.0.min.css': 'assets/css/tilda-date-picker-1.0.min.css',
        'https://static.tildacdn.com/css/tilda-img-select-1.0.min.css': 'assets/css/tilda-img-select-1.0.min.css',
        'https://static.tildacdn.com/css/tilda-range-1.0.min.css': 'assets/css/tilda-range-1.0.min.css',
        'https://static.tildacdn.com/css/tilda-zero-form-errorbox.min.css': 'assets/css/tilda-zero-form-errorbox.min.css',
        'https://static.tildacdn.com/css/tilda-zero-form-horizontal.min.css': 'assets/css/tilda-zero-form-horizontal.min.css',
        'https://static.tildacdn.com/js/tilda-date-picker-1.0.min.js': 'assets/js/tilda-date-picker-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-img-select-1.0.min.js': 'assets/js/tilda-img-select-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-range-1.0.min.js': 'assets/js/tilda-range-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-phone-mask-1.1.min.js': 'assets/js/tilda-phone-mask-1.1.min.js',
        'https://static.tildacdn.com/js/tilda-calc-1.0.min.js': 'assets/js/tilda-calc-1.0.min.js',
        'https://static.tildacdn.com/js/tilda-upwidget-1.1.min.js': 'assets/js/tilda-upwidget-1.1.min.js',
        'https://static.tildacdn.com/js/uploadcare-3.x.min.js': 'assets/js/uploadcare-3.x.min.js',
        'https://static.tildacdn.com/js/uploadcare-3.x.full.min.js': 'assets/js/uploadcare-3.x.full.min.js',
        'https://static.tildacdn.com/js/tilda-stat-1.0.min.js': 'assets/js/tilda-stat-1.0.min.js',
        'https://www.dropbox.com/scl/fi/pw2qzjc6mlw15zb975izh/Sleeping_At_Last_-_Turning_Page_48331714.mp3?rlkey=dxcxxea64nhcbknpsmgfd89iv&st=qn3zeyn4&raw=1': 'assets/audio/background.mp3',
    }

    # Static images from HTML
    image_urls = [
        'https://static.tildacdn.com/tild3134-6133-4362-a139-636130653361/7e97f76b4f728141918c.svg',
        'https://static.tildacdn.com/tild6531-3164-4236-b562-663539393732/Group_254_1.svg',
        'https://static.tildacdn.com/tild6164-3162-4665-b264-633732393030/noroot.png',
        'https://static.tildacdn.com/tild3136-3864-4537-a130-643634393763/Frame_15.svg',
        'https://static.tildacdn.com/tild3035-3866-4630-b164-346239356337/dfe99274915cdcdd9d3b.svg',
        'https://static.tildacdn.com/tild6663-6661-4136-b761-363065656565/Frame_50.svg',
        'https://static.tildacdn.com/tild6264-3966-4265-a136-666536333764/_12_1.svg',
        'https://static.tildacdn.com/tild6236-3761-4339-b732-363636396564/__9.svg',
        'https://static.tildacdn.com/tild3837-3736-4063-b234-383239643833/Group_248_1.png',
        'https://static.tildacdn.com/tild6163-3366-4162-b131-616162626235/Group_28.png',
        'https://static.tildacdn.com/tild3762-3266-4264-a538-313938383962/_7_1.png',
        'https://static.tildacdn.com/tild3361-3330-4131-b861-316634656535/_.svg',
        'https://static.tildacdn.com/tild6565-3561-4336-a535-356339376437/Group_3.svg',
        'https://static.tildacdn.com/tild3835-3966-4161-a437-363961353466/Group_8.svg',
        'https://static.tildacdn.com/tild6163-3532-4361-b738-643935633737/Group_7.svg',
        'https://static.tildacdn.com/tild6462-3632-4137-a233-633432386566/Group_5.svg',
        'https://static.tildacdn.com/tild6535-3734-4464-b837-666166663566/Group_6.svg',
        'https://static.tildacdn.com/tild6130-3036-4566-b730-353336386661/Group_2.svg',
        'https://static.tildacdn.com/tild3262-3361-4032-a630-393764613237/54c579ec69ac8e23c748.svg',
        'https://static.tildacdn.com/tild3163-6164-4334-b361-376436303830/Group_247.svg',
        'https://static.tildacdn.com/tild3438-3563-4666-a661-346366303737/Frame_44.svg',
        'https://static.tildacdn.com/tild6330-3664-4530-b765-356463356463/Group_14.svg',
        'https://static.tildacdn.com/tild3538-3032-4236-a565-623466383431/55ea2c7d8d62bc852d4d.svg',
        'https://static.tildacdn.com/tild3265-3439-4664-b265-393436616530/Group_257.svg',
        'https://static.tildacdn.com/tild6435-3366-4764-b666-393965323037/favicon_1.png',
        'https://static.tildacdn.com/tild3165-6561-4636-a437-393833346565/favicon.png',
        'https://static.tildacdn.com/tild3932-3863-4662-b565-623364653061/favicon_1.png',
    ]
    for url in image_urls:
        replacements[url] = 'assets/images/' + url.split('/')[-1]

    replacements.update(thumb_to_full)
    return replacements, thumb_to_full


def main():
    with open(os.path.join(ROOT, 'source.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    replacements, thumb_to_full = load_map()

    for url, local in sorted(replacements.items(), key=lambda x: -len(x[0])):
        html = html.replace(url, local)

    # Remove copy protection block
    html = re.sub(
        r'<!-- nominify begin --><style>\s*/\*.*?</style>\s*<script>.*?</script>\s*<script src="https://cdn\.postnikovmd\.com/tilda@1\.5/mods\.min\.js"></script><!-- nominify end -->',
        '<script src="assets/js/mods.min.js"></script>',
        html,
        flags=re.DOTALL,
        count=1,
    )
    html = re.sub(
        r'<script>\s*document\.addEventListener\(\'keydown\'.*?</script>',
        '',
        html,
        flags=re.DOTALL,
        count=1,
    )

    html = html.replace('<meta name="robots" content="noindex" />', '')
    html = html.replace('data-tilda-lazy="yes"', 'data-tilda-lazy="no"')
    html = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2\?family=Playfair\+Display:wght@400\.\.900[^"]*" rel="stylesheet">',
        '',
        html,
    )
    html = html.replace('<link rel="preconnect" href="https://fonts.gstatic.com">', '')
    html = html.replace('<body class="t-body"', '<body class="t-body allow-copy"')
    html = html.replace('<title>Макет Этюд</title>', '<title>Приглашение на свадьбу</title>')

    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

    print('index.html written with UTF-8 encoding')


if __name__ == '__main__':
    main()
