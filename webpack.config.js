/**
 **** WARNING: No ES6 modules here. Not transpiled! ****
 */
/* eslint-disable import/no-nodejs-modules */

/**
 * External dependencies
 */
const _ = require( 'lodash' );
const path = require( 'path' );
// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require( 'webpack' );
const AssetsWriter = require( './server/bundler/assets-writer' );
const ConfigFlagPlugin = require( '@automattic/webpack-config-flag-plugin' );
const { BundleAnalyzerPlugin } = require( 'webpack-bundle-analyzer' );
const CircularDependencyPlugin = require( 'circular-dependency-plugin' );
// eslint-disable-next-line import/no-extraneous-dependencies
const DuplicatePackageCheckerPlugin = require( 'duplicate-package-checker-webpack-plugin' );
const FileConfig = require( '@automattic/calypso-build/webpack/file-loader' );
const MomentTimezoneDataPlugin = require( 'moment-timezone-data-webpack-plugin' );
const InlineConstantExportsPlugin = require( '@automattic/webpack-inline-constant-exports-plugin' );
const Minify = require( '@automattic/calypso-build/webpack/minify' );
const SassConfig = require( '@automattic/calypso-build/webpack/sass' );
const TranspileConfig = require( '@automattic/calypso-build/webpack/transpile' );
const {
	cssNameFromFilename,
	IncrementalProgressPlugin,
	shouldTranspileDependency,
} = require( '@automattic/calypso-build/webpack/util' );
const ExtensiveLodashReplacementPlugin = require( '@automattic/webpack-extensive-lodash-replacement-plugin' );

/**
 * Internal dependencies
 */
const cacheIdentifier = require( './server/bundler/babel/babel-loader-cache-identifier' );
const config = require( './server/config' );
const { workerCount } = require( './webpack.common' );
const getAliasesForExtensions = require( './config/webpack/extensions' );

/**
 * Internal variables
 */
const calypsoEnv = config( 'env_id' );
const bundleEnv = config( 'env' );
const isDevelopment = bundleEnv !== 'production';
const shouldMinify =
	process.env.MINIFY_JS === 'true' ||
	( process.env.MINIFY_JS !== 'false' && bundleEnv === 'production' && calypsoEnv !== 'desktop' );
const shouldEmitStats = process.env.EMIT_STATS && process.env.EMIT_STATS !== 'false';
const shouldShowProgress = process.env.PROGRESS && process.env.PROGRESS !== 'false';
const shouldEmitStatsWithReasons = process.env.EMIT_STATS === 'withreasons';
const shouldCheckForCycles = process.env.CHECK_CYCLES === 'true';
const isCalypsoClient = process.env.BROWSERSLIST_ENV !== 'server';
const isDesktop = calypsoEnv === 'desktop' || calypsoEnv === 'desktop-development';

const defaultBrowserslistEnv = isCalypsoClient && ! isDesktop ? 'evergreen' : 'defaults';
const browserslistEnv = process.env.BROWSERSLIST_ENV || defaultBrowserslistEnv;
const extraPath = browserslistEnv === 'defaults' ? 'fallback' : browserslistEnv;

if ( ! process.env.BROWSERSLIST_ENV ) {
	process.env.BROWSERSLIST_ENV = browserslistEnv;
}

let outputFilename = '[name].[chunkhash].min.js'; // prefer the chunkhash, which depends on the chunk, not the entire build
let outputChunkFilename = '[name].[chunkhash].min.js'; // ditto

// we should not use chunkhash in development: https://github.com/webpack/webpack-dev-server/issues/377#issuecomment-241258405
// also we don't minify so dont name them .min.js
//
// Desktop: no chunks or dll here, just one big file for the desktop app
if ( isDevelopment || isDesktop ) {
	outputFilename = '[name].js';
	outputChunkFilename = '[name].js';
}

const cssFilename = cssNameFromFilename( outputFilename );
const cssChunkFilename = cssNameFromFilename( outputChunkFilename );

const fileLoader = FileConfig.loader(
	// The server bundler express middleware server assets from the hard-coded publicPath `/calypso/evergreen/`.
	// This is required so that running calypso via `npm start` doesn't break.
	isDevelopment
		? {
				outputPath: 'images',
				publicPath: '/calypso/evergreen/images/',
		  }
		: {
				// File-loader does not understand absolute paths so __dirname won't work.
				// Build off `output.path` for a result like `/…/public/evergreen/../images/`.
				outputPath: path.join( '..', 'images' ),
				publicPath: '/calypso/images/',
				emitFile: browserslistEnv === defaultBrowserslistEnv, // Only output files once.
		  }
);

const webpackConfig = {
	bail: ! isDevelopment,
	context: __dirname,
	entry: {
		'entry-main': [ path.join( __dirname, 'client', 'boot', 'app' ) ],
		'entry-domains-landing': [ path.join( __dirname, 'client', 'landing', 'domains' ) ],
		'entry-login': [ path.join( __dirname, 'client', 'landing', 'login' ) ],
		'entry-gutenboarding': [ path.join( __dirname, 'client', 'landing', 'gutenboarding' ) ],
	},
	mode: isDevelopment ? 'development' : 'production',
	devtool: process.env.SOURCEMAP || ( isDevelopment ? '#eval' : false ),
	output: {
		path: path.join( __dirname, 'public', extraPath ),
		pathinfo: false,
		publicPath: `/calypso/${ extraPath }/`,
		filename: outputFilename,
		chunkFilename: outputChunkFilename,
		devtoolModuleFilenameTemplate: 'app:///[resource-path]',
	},
	optimization: {
		splitChunks: {
			chunks: 'all',
			name: !! ( isDevelopment || shouldEmitStats ),
			maxAsyncRequests: 20,
			maxInitialRequests: 5,
		},
		runtimeChunk: isDesktop ? false : { name: 'manifest' },
		moduleIds: 'named',
		chunkIds: isDevelopment || shouldEmitStats ? 'named' : 'natural',
		minimize: shouldMinify,
		minimizer: Minify( {
			cache: process.env.CIRCLECI
				? `${ process.env.HOME }/terser-cache/${ extraPath }`
				: 'docker' !== process.env.CONTAINER,
			parallel: workerCount,
			sourceMap: Boolean( process.env.SOURCEMAP ),
			terserOptions: {
				mangle: ! isDesktop,
			},
		} ),
	},
	module: {
		rules: [
			TranspileConfig.loader( {
				workerCount,
				configFile: path.join( __dirname, 'babel.config.js' ),
				cacheDirectory: path.join( __dirname, 'build', '.babel-client-cache', extraPath ),
				cacheIdentifier,
				exclude: /node_modules\//,
			} ),
			TranspileConfig.loader( {
				workerCount,
				presets: [ require.resolve( '@automattic/calypso-build/babel/dependencies' ) ],
				cacheDirectory: path.join( __dirname, 'build', '.babel-client-cache', extraPath ),
				cacheIdentifier,
				include: shouldTranspileDependency,
			} ),
			SassConfig.loader( {
				includePaths: [ path.join( __dirname, 'client' ) ],
				prelude: `@import '${ path.join(
					__dirname,
					'client/assets/stylesheets/shared/_utils.scss'
				) }';`,
			} ),
			{
				include: path.join( __dirname, 'client/sections.js' ),
				loader: path.join( __dirname, 'server', 'bundler', 'sections-loader' ),
				options: {
					include: process.env.SECTION_LIMIT ? process.env.SECTION_LIMIT.split( ',' ) : null,
				},
			},
			{
				test: /\.html$/,
				loader: 'html-loader',
			},
			fileLoader,
			{
				include: require.resolve( 'tinymce/tinymce' ),
				use: 'exports-loader?window=tinymce',
			},
			{
				test: /node_modules[/\\]tinymce/,
				use: 'imports-loader?this=>window',
			},
		],
	},
	resolve: {
		extensions: [ '.json', '.js', '.jsx', '.ts', '.tsx' ],
		modules: [ path.join( __dirname, 'client' ), 'node_modules' ],
		alias: Object.assign(
			{
				'react-virtualized': 'react-virtualized/dist/es',
				debug: path.resolve( __dirname, 'node_modules/debug' ),
				store: 'store/dist/store.modern',
				gridicons$: path.resolve( __dirname, 'client/components/gridicon' ),
			},
			getAliasesForExtensions( {
				extensionsDirectory: path.join( __dirname, 'client', 'extensions' ),
			} )
		),
	},
	node: false,
	plugins: _.compact( [
		new webpack.DefinePlugin( {
			'process.env.NODE_ENV': JSON.stringify( bundleEnv ),
			'process.env.GUTENBERG_PHASE': JSON.stringify( 1 ),
			'process.env.FORCE_REDUCED_MOTION': JSON.stringify(
				!! process.env.FORCE_REDUCED_MOTION || false
			),
			global: 'window',
		} ),
		new webpack.NormalModuleReplacementPlugin( /^path$/, 'path-browserify' ),
		isCalypsoClient && new webpack.IgnorePlugin( /^\.\/locale$/, /moment$/ ),
		...SassConfig.plugins( {
			chunkFilename: cssChunkFilename,
			filename: cssFilename,
			minify: ! isDevelopment,
		} ),
		isCalypsoClient &&
			new AssetsWriter( {
				filename:
					browserslistEnv === 'defaults'
						? 'assets-fallback.json'
						: `assets-${ browserslistEnv }.json`,
				path: path.join( __dirname, 'server', 'bundler' ),
				assetExtraPath: extraPath,
			} ),
		new DuplicatePackageCheckerPlugin(),
		shouldCheckForCycles &&
			new CircularDependencyPlugin( {
				exclude: /node_modules/,
				failOnError: false,
				allowAsyncCycles: false,
				cwd: process.cwd(),
			} ),
		shouldEmitStats &&
			new BundleAnalyzerPlugin( {
				analyzerMode: 'disabled', // just write the stats.json file
				generateStatsFile: true,
				statsFilename: path.join( __dirname, 'stats.json' ),
				statsOptions: {
					source: false,
					reasons: shouldEmitStatsWithReasons,
					optimizationBailout: false,
					chunkOrigins: false,
					chunkGroups: true,
				},
			} ),
		shouldShowProgress && new IncrementalProgressPlugin(),
		new MomentTimezoneDataPlugin( {
			startYear: 2000,
			cacheDir: path.join(
				__dirname,
				'build',
				'.moment-timezone-data-webpack-plugin-cache',
				extraPath
			),
		} ),
		new ConfigFlagPlugin( {
			flags: { desktop: config.isEnabled( 'desktop' ) },
		} ),
		isCalypsoClient && new InlineConstantExportsPlugin( /\/client\/state\/action-types.js$/ ),
		isDevelopment && new webpack.HotModuleReplacementPlugin(),
	] ),
	externals: [ 'electron' ],
};

if ( ! config.isEnabled( 'desktop' ) ) {
	webpackConfig.plugins.push(
		new webpack.NormalModuleReplacementPlugin( /^lib[/\\]desktop$/, 'lodash-es/noop' )
	);
}

// Replace `lodash` with `lodash-es`.
if ( isCalypsoClient ) {
	webpackConfig.plugins.push( new ExtensiveLodashReplacementPlugin() );
}

// Don't bundle `wpcom-xhr-request` for the browser.
// Even though it's requested, we don't need it on the browser, because we're using
// `wpcom-proxy-request` instead. Keep it for desktop and server, though.
if ( isCalypsoClient && ! isDesktop ) {
	webpackConfig.plugins.push(
		new webpack.NormalModuleReplacementPlugin( /^wpcom-xhr-request$/, 'lodash-es/noop' )
	);
}

if ( isCalypsoClient && browserslistEnv === 'evergreen' ) {
	// Use "evergreen" polyfill config, rather than fallback.
	webpackConfig.plugins.push(
		new webpack.NormalModuleReplacementPlugin(
			/^@automattic\/calypso-polyfills$/,
			'@automattic/calypso-polyfills/browser-evergreen'
		)
	);

	// Local storage used to throw errors in Safari private mode, but that's no longer the case in Safari >=11.
	webpackConfig.plugins.push(
		new webpack.NormalModuleReplacementPlugin(
			/^lib[/\\]local-storage-polyfill$/,
			'lodash-es/noop'
		)
	);
}

module.exports = webpackConfig;