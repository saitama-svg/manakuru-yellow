# ワードルーレッタ：GitHub Pages公開用ファイル

このフォルダーには、サイトの入口となる `index.html` と、公開手順をまとめています。

## 無料で公開する手順（GitHub Pages）

1. GitHub にサインインします。
2. **New repository** から新しいリポジトリを作成します。例：`word-roulette`
3. GitHub Freeで公開する場合は、リポジトリを **Public（公開）** にします。
4. このフォルダー内の `index.html` と `.nojekyll` をリポジトリの最上位へアップロードします。
5. リポジトリの **Settings → Pages** を開きます。
6. **Build and deployment** の **Source** で **Deploy from a branch** を選びます。
7. Branchを `main`、フォルダーを `/(root)` にして **Save** します。
8. Pagesの画面に表示されるサイトURLを開きます。プロジェクトサイトのURLは通常 `https://<GitHubユーザー名>.github.io/<リポジトリ名>/` の形式です。
9. 初回公開には数分かかることがあります。GitHubのPages画面に表示される状態を確認してください。

公開後にアプリを更新する場合は、新しい `index.html` を同じリポジトリの最上位にアップロードして置き換えます。

## 重要な注意

- GitHub Pagesは公開サイトです。リンクを知っている人だけに制限するログイン機能は、このHTMLだけでは提供されません。
- GitHub Freeでは、Pagesのソースに使うリポジトリを公開する必要があります。つまりHTML/JavaScriptのソースコードも公開状態になります。秘密の情報、個人情報、パスワード、個人用の問題データをソースに入れないでください。
- このアプリはログインやクラウド同期を実装していません。問題集・成績・ノートなどは、基本的に各利用者のブラウザ内に保存され、利用者同士で自動共有されません。
- ダウンロード版HTMLの保存データは、サイト版へ自動では引き継がれません。移行したい場合は、古い版で「全データを保存」を行い、サイト版で「全データを復元」してください。
- ブラウザ内の保存領域は、ブラウザや端末を変えると別になります。大切な学習データは定期的にJSONバックアップを保存してください。
- アプリは `location.origin`、ページのパス、クエリをもとに保存先を分けます。公開URLやリポジトリ名を変えると、別の保存領域として扱われる場合があります。公開先のURLを安定させてください。
- URLに問題データを付けて開く場合、クエリ付きURLと通常URLで保存先が分かれることがあります。長期的に使うデータは通常の公開URLで管理し、必要ならバックアップを利用してください。

## GitHub公式ガイド

- GitHub Pagesのサイト作成： https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- GitHub Pagesとは： https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
