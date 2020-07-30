/**
 * External dependencies
 *
 */
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Internal dependencies
 */
import config from 'config';
import isJetpackCloud from 'lib/jetpack/is-jetpack-cloud';

const Head = ( {
	title = 'WordPress.com',
	faviconURL,
	children,
	cdn,
	branchName,
	inlineScriptNonce,
} ) => {
	return (
		<head>
			<title>{ title }</title>

			<meta charSet="utf-8" />
			<meta httpEquiv="X-UA-Compatible" content="IE=Edge" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="format-detection" content="telephone=no" />
			<meta name="mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta
				name="theme-color"
				content={ ! config( 'theme_color' ) ? '#016087' : config( 'theme_color' ) }
			/>
			<meta name="referrer" content="origin" />

			<link
				rel="prefetch"
				as="document"
				href="https://public-api.wordpress.com/wp-admin/rest-proxy/?v=2.0"
			/>

			<link
				rel="shortcut icon"
				type="image/vnd.microsoft.icon"
				href={ faviconURL }
				sizes="16x16 32x32"
			/>
			<link rel="shortcut icon" type="image/x-icon" href={ faviconURL } sizes="16x16 32x32" />
			<link rel="icon" type="image/x-icon" href={ faviconURL } sizes="16x16 32x32" />

			{ isJetpackCloud() && <JetpackFavicons /> }
			{ ! isJetpackCloud() && <WordPressFavicons cdn={ cdn } /> }

			<link rel="profile" href="http://gmpg.org/xfn/11" />

			{ ! branchName || 'master' === branchName ? (
				<link rel="manifest" href="/calypso/manifest.json" />
			) : (
				<link
					rel="manifest"
					href={ '/calypso/manifest.json?branch=' + encodeURIComponent( branchName ) }
				/>
			) }
			<link
				rel="preload"
				href="https://fonts.googleapis.com/css?family=Noto+Serif:400,400i,700,700i&subset=cyrillic,cyrillic-ext,greek,greek-ext,latin-ext,vietnamese&display=swap"
				as="style"
			/>
			<noscript>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css?family=Noto+Serif:400,400i,700,700i&subset=cyrillic,cyrillic-ext,greek,greek-ext,latin-ext,vietnamese&display=swap"
				/>
			</noscript>
			{ /* eslint-disable react/no-danger */ }
			<script
				type="text/javascript"
				nonce={ inlineScriptNonce }
				dangerouslySetInnerHTML={ {
					// eslint-disable
					__html: `
			(function() {
				var m = document.createElement( "link" );
				m.rel = "stylesheet";
				m.href = "https://fonts.googleapis.com/css?family=Noto+Serif:400,400i,700,700i&subset=cyrillic,cyrillic-ext,greek,greek-ext,latin-ext,vietnamese&display=swap";
				document.head.insertBefore( m, document.head.childNodes[ document.head.childNodes.length - 1 ].nextSibling );
			})()
			`,
				} }
			/>
			{ /* eslint-enable react/no-danger */ }
			{ children }
		</head>
	);
};

const WordPressFavicons = ( { cdn } ) => (
	<>
		<link
			rel="icon"
			type="image/png"
			href={ cdn + '/i/favicons/favicon-64x64.png' }
			sizes="64x64"
		/>
		<link
			rel="icon"
			type="image/png"
			href={ cdn + '/i/favicons/favicon-96x96.png' }
			sizes="96x96"
		/>
		<link
			rel="icon"
			type="image/png"
			href={ cdn + '/i/favicons/android-chrome-192x192.png' }
			sizes="192x192"
		/>
		{ [ 57, 60, 72, 76, 114, 120, 144, 152, 180 ].map( ( size ) => (
			<link
				key={ size }
				rel="apple-touch-icon"
				sizes={ `${ size }x${ size }` }
				href={ cdn + `/i/favicons/apple-touch-icon-${ size }x${ size }.png` }
			/>
		) ) }
	</>
);

const JetpackFavicons = () => (
	<>
		<link
			rel="mask-icon"
			href="/calypso/images/jetpack/favicons/safari-pinned-tab.svg"
			color="#00be28"
		/>
		<meta name="application-name" content="Jetpack.com" />
		<meta
			name="msapplication-config"
			content="/calypso/images/jetpack/favicons/browserconfig.xml"
		/>
		<link
			rel="icon"
			sizes="512x512"
			href="/calypso/images/jetpack/favicons/android-chrome-512x512.png"
		/>
		<link
			rel="icon"
			sizes="192x192"
			href="/calypso/images/jetpack/favicons/android-chrome-192x192.png"
		/>
		<link
			rel="apple-touch-icon"
			sizes="180x180"
			href="/calypso/images/jetpack/favicons/apple-touch-icon.png"
		/>
	</>
);

Head.propTypes = {
	title: PropTypes.string,
	faviconURL: PropTypes.string.isRequired,
	children: PropTypes.node,
	cdn: PropTypes.string.isRequired,
	branchName: PropTypes.string,
};

export default Head;
