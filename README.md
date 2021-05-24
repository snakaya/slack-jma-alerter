# slack-jma-aleter

気象庁が配信している[気象庁防災情報XML](http://xml.kishou.go.jp/)のうち地震に関する情報を読んで、概要をSlackに投げます。

[walkureさん](https://github.com/walkure)が作成された[slack-eqvol-notifier](https://github.com/walkure/slack-eqvol-notifier)を個人的に使うための改造版です。

詳しくは上記リンクを参照して下さい。

## 改造部分

- TypeScript & Bolt対応
- 気象情報に対応
- POSTする気象情報および地震情報条件をConfigファイルで設定できるようにしました
- Linixのsystemd用のserviceファイルを同梱しました
- ステータス保存ファイル(state.json)の位置はデフォルトで/tmp以下としてConfigファイルで設定できるようにしました

## 使い方

- インストールディレクトリへ移動して、依存パッケージをインストールする

  - ` npm install `

- config/以下のdefault.json-distからdefault.jsonをコピーで作成して、適当に内容を変更する

  - Settingsのステータス保存ファイルやPOSTする気象情報および地震情報の条件を指定します
  - Slackのincoming Webhook URIとチャンネルを指定します

- 起動する

  - ` npm run start `
  - またはsystemd用のserviceファイルを設定してsystemctlコマンドから起動して下さい

## Permissiona

- OAuth Scopesとして、 `incoming-webhook` および `chat:write` が必要です

## License

MIT
