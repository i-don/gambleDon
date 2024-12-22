function check_python {
	gcm python -ea SilentlyContinue | Out-Null
	if ($? -eq $true) { # コマンドが存在すれば
	    Write-Output 'Success!'
	    python --version
	} else {            # コマンドが存在しなければ
	    Write-Error 'Error!'
	    exit 1
	}
}
echo develop
check_python
