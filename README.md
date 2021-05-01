# slack-jma-aleter

気象庁が配信している[気象庁防災情報XML](http://xml.kishou.go.jp/)のうち地震に関する情報を読んで、概要をSlackに投げます。

[walkureさん](https://github.com/walkure)が作成された[slack-eqvol-notifier](https://github.com/walkure/slack-eqvol-notifier)を個人的に使うための改造版です。

詳しくは上記リンクを参照して下さい。

## 改造部分

- POSTする地震情報の種類をConfigファイルで設定できるようにしました
- Linixのsystemd用のserviceファイルを同梱しました
- ステータス保存ファイル(state.json)の位置はデフォルトで/tmp以下としてConfigファイルで設定できるようにしました

## 使い方

- インストールディレクトリへ移動して、依存パッケージをインストールする

  - ` npm install `

- config/以下のdefault.json-distからdefault.jsonをコピーで作成して、適当に内容を変更する

  - Settingsのステータス保存ファイルやPOSTする地震情報種類を指定します
  - Slackのincoming Webhook URIとチャンネルを指定します

- 起動する

  - ` node ./jmapull.js `
  - またはsystemd用のserviceファイルを設定してsystemctlコマンドから起動して下さい

## TODO

- [ ] 気象情報への対応
- [ ] TS化

## License

MIT
