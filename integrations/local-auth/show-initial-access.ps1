param([switch]$LocalTest)
$ErrorActionPreference='Stop'
try {
    $vaultRoot=Join-Path $env:USERPROFILE '.openclaw/estrelas-compras'
    $path=Join-Path $vaultRoot $(if($LocalTest){'local-users-test.dpapi'}else{'local-users.dpapi'})
    $encrypted=(Get-Content -LiteralPath $path -Raw).Trim() | ConvertTo-SecureString
    $access=[System.Net.NetworkCredential]::new('', $encrypted).Password | ConvertFrom-Json
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $form=New-Object Windows.Forms.Form
    $form.Text='Colégio Estrelas — Acessos iniciais'
    $form.Size=New-Object Drawing.Size(610,460)
    $form.StartPosition='CenterScreen'
    $form.MaximizeBox=$false
    $form.FormBorderStyle='FixedDialog'
    $label=New-Object Windows.Forms.Label
    $label.Text="Senhas de acesso — alteração opcional.`nO arquivo permanece criptografado neste computador."
    $label.SetBounds(20,15,560,45)
    $form.Controls.Add($label)
    $y=75
    foreach($user in $access.users){
        $login=New-Object Windows.Forms.Label
        $login.Text=$user.username+' — '+$user.name
        $login.SetBounds(20,$y,550,25)
        $form.Controls.Add($login)
        $box=New-Object Windows.Forms.TextBox
        $box.Text=$user.password
        $box.ReadOnly=$true
        $box.UseSystemPasswordChar=$true
        $box.SetBounds(20,($y+25),400,25)
        $form.Controls.Add($box)
        $toggle=New-Object Windows.Forms.CheckBox
        $toggle.Text='Mostrar'
        $toggle.SetBounds(435,($y+25),100,25)
        $toggle.Tag=$box
        $toggle.Add_CheckedChanged({param($sender,$eventArgs)$sender.Tag.UseSystemPasswordChar=-not $sender.Checked})
        $form.Controls.Add($toggle)
        $y+=85
    }
    $open=New-Object Windows.Forms.Button
    $open.Text='Abrir sistema'
    $open.SetBounds(20,345,160,32)
    $open.Tag=[string]$access.site
    $open.Add_Click({param($sender,$eventArgs)Start-Process -FilePath $sender.Tag -WindowStyle Hidden})
    $form.Controls.Add($open)
    [void]$form.ShowDialog()
    $form.Dispose()
} catch { [Console]::Error.WriteLine('Não foi possível abrir os acessos. Use o mesmo usuário Windows que os criou.');exit 1 }
