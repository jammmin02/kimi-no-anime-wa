// UI 文字列の一元管理場所(日本語)。
//
// 優先市場が日本語ユーザーのため、現段階(Phase 1)では日本語文字列をこのファイルに
// 直接ハードコードしている。本格的な i18n 対応は P1-7(implementation_prompts_ko.md 参照)で
// 行う予定で、その際はここに集約した文字列を next-intl 等のメッセージファイルへ
// そのまま移植できるように、キーをネストしたプレーンオブジェクトの形にしてある。
// 画面側のコンポーネントは文字列を直接書かず、必ずこのオブジェクト経由で参照すること。

import { MAX_TASTE_KEYWORD_COUNT, MIN_PASSWORD_LENGTH } from '@/lib/constants/auth';
import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants/chat';
import { MIN_REVIEW_COUNT_FOR_RANKING } from '@/lib/constants/ranking';
import { MAX_COMMENT_BODY_LENGTH, MAX_REVIEW_BODY_LENGTH } from '@/lib/constants/reviews';
import { MIN_REVIEWS_FOR_SUMMARY } from '@/lib/constants/reviewSummaries';
import { MAX_SEARCH_QUERY_LENGTH } from '@/lib/constants/search';

export const ja = {
  auth: {
    signup: {
      title: '新規登録',
      description: 'メールアドレスとパスワードで登録します。',
      emailLabel: 'メールアドレス',
      passwordLabel: 'パスワード',
      passwordHelper: `${MIN_PASSWORD_LENGTH} 文字以上で入力してください。`,
      nicknameLabel: 'ニックネーム',
      nicknameHelper: '他のユーザーに表示される名前です。',
      submit: '登録する',
      submitting: '登録中…',
      loginPrompt: 'すでにアカウントをお持ちの方は',
      loginLink: 'ログイン',
      errors: {
        emailInvalid: 'メールアドレスの形式が正しくありません。',
        emailTaken: 'このメールアドレスはすでに登録されています。',
        passwordTooShort: `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上で入力してください。`,
        passwordTooLong: 'パスワードが長すぎます。',
        nicknameRequired: 'ニックネームを入力してください。',
        nicknameTooLong: 'ニックネームが長すぎます。',
        generic: '登録に失敗しました。時間をおいて再度お試しください。',
      },
    },
    login: {
      title: 'ログイン',
      description: '登録済みのメールアドレスとパスワードでログインします。',
      emailLabel: 'メールアドレス',
      passwordLabel: 'パスワード',
      submit: 'ログイン',
      submitting: 'ログイン中…',
      signupPrompt: 'アカウントをお持ちでない方は',
      signupLink: '新規登録',
      errors: {
        invalidCredentials: 'メールアドレスまたはパスワードが正しくありません。',
        generic: 'ログインに失敗しました。時間をおいて再度お試しください。',
      },
    },
    logout: {
      button: 'ログアウト',
    },
    navbar: {
      loginLink: 'ログイン',
      signupLink: '新規登録',
      mypageLink: 'マイページ',
    },
  },
  mypage: {
    title: 'マイページ',
    greeting: (nickname: string) => `${nickname} さん、こんにちは。`,
    tasteKeywords: {
      title: '好みのキーワード',
      description:
        'ジャンルやタグなどの好みのキーワードを登録しておくと、今後のおすすめ機能で活用されます。',
      inputPlaceholder: '例: 異世界、青春、ダークファンタジー',
      addButton: '追加',
      removeLabel: (keyword: string) => `${keyword} を削除`,
      empty: 'まだキーワードが登録されていません。',
      saveButton: '保存する',
      saving: '保存中…',
      saveSuccess: '保存しました。',
      errors: {
        empty: 'キーワードを入力してください。',
        tooLong: 'キーワードが長すぎます。',
        tooMany: `キーワードは ${MAX_TASTE_KEYWORD_COUNT} 件まで登録できます。`,
        duplicate: 'すでに登録されているキーワードです。',
        unauthorized: 'セッションの有効期限が切れました。再度ログインしてください。',
        generic: '保存に失敗しました。時間をおいて再度お試しください。',
      },
    },
    library: {
      // P1-8: マイページの保管庫一覧(状態別フィルタ付き)。
      title: '保管庫',
      description: 'お気に入り登録した作品や、視聴/閲読状況を確認できます。',
      viewAll: '保管庫を見る',
      filterAll: 'すべて',
      // 作品詳細ページの statusLabels(アニメ/マンガで文言が変わる)とは別に、
      // ここは両方の作品種別が混在する一覧のフィルタなので、種別に依存しない文言にする。
      statusFilterLabels: {
        PLANNING: 'お気に入り・予定',
        WATCHING: '視聴中・閲読中',
        COMPLETED: '完了',
        ON_HOLD: '中断',
        DROPPED: '中止',
      },
      empty: {
        title: '保管庫はまだ空です',
        description: '気になる作品を保管庫に追加しましょう。',
      },
    },
  },
  works: {
    list: {
      title: '作品一覧',
      typeFilterAll: 'すべて',
      typeFilterLabels: {
        ANIME: 'アニメ',
        MANGA: 'マンガ',
      },
      genreFilterAll: 'すべてのジャンル',
      resultCount: (count: number) => `${count} 件の作品`,
      empty: {
        title: '該当する作品が見つかりません',
        description: 'フィルタ条件を変更して再度お試しください。',
      },
      pagination: {
        prev: '前へ',
        next: '次へ',
        pageOf: (current: number, total: number) => `${current} / ${total} ページ`,
      },
    },
    detail: {
      // 作品種別バッジの表示ラベル。
      typeLabels: {
        ANIME: 'アニメ',
        MANGA: 'マンガ',
      },
      genresTitle: 'ジャンル',
      tagsTitle: 'タグ',
      countryLabel: '原産国',
      countryNames: {
        JP: '日本',
        KR: '韓国',
        CN: '中国',
        TW: '台湾',
        OTHER: 'その他',
      },
      seasonLabel: (seasonLabel: string, seasonYear: number) => `${seasonYear}年 ${seasonLabel}`,
      seasonNames: {
        WINTER: '冬',
        SPRING: '春',
        SUMMER: '夏',
        FALL: '秋',
      },
      episodesLabel: (count: number) => `全 ${count} 話`,
      chaptersLabel: (count: number) => `全 ${count} 話(章)`,
      volumesLabel: (count: number) => `全 ${count} 巻`,
      // AniList 由来の参考指標(popularity/averageScore/trending)専用のセクション。
      // 当サービスの並び替え・ランキングには絶対に使用しないこと
      // (implementation_prompts_ko.md 共通規則参照)。あくまで参考表示のみ。
      referenceInfo: {
        title: '参考情報(AniList)',
        description: 'AniList 上の指標です。当サービスの並び替え・ランキングには使用していません。',
        popularityLabel: (value: number) => `人気度: ${value}`,
        averageScoreLabel: (value: number) => `平均スコア: ${value} / 100`,
        trendingLabel: (value: number) => `トレンド指数: ${value}`,
      },
    },
    library: {
      // P1-8: 作品詳細ページでの保管庫ステータス変更ドロップダウン。
      label: '保管庫',
      notInLibrary: '未登録',
      loginPrompt: '保管庫に登録するにはログインしてください。',
      // アニメ/マンガで「視聴」「閲読」のように文言を変える。
      statusLabels: {
        PLANNING: { ANIME: '視聴予定', MANGA: '閲読予定' },
        WATCHING: { ANIME: '視聴中', MANGA: '閲読中' },
        COMPLETED: { ANIME: '完了', MANGA: '完了' },
        ON_HOLD: { ANIME: '中断', MANGA: '中断' },
        DROPPED: { ANIME: '中止', MANGA: '中止' },
      },
      errors: {
        unauthorized: 'セッションの有効期限が切れました。再度ログインしてください。',
        invalidStatus: '無効なステータスです。',
        notFound: 'この作品は見つかりませんでした。',
        generic: '更新に失敗しました。時間をおいて再度お試しください。',
      },
    },
    relations: {
      // P1-3: 原作-アニメ-続編-外伝のつながりを表示するセクション。
      // relations データが 1 件も無い作品では、この見出しごとセクションを描画しない。
      sectionTitle: '作品のつながり',
      sectionDescription: '原作・アニメ化・続編・外伝など、この作品と関連する作品の一覧です。',
      // AniList の relationType ごとの見出しラベル。
      relationTypeLabels: {
        SOURCE: '原作',
        ADAPTATION: 'アニメ化・メディア化作品',
        PREQUEL: '前作',
        SEQUEL: '続編',
        PARENT: '本編',
        SIDE_STORY: '外伝',
        SPIN_OFF: 'スピンオフ',
        ALTERNATIVE: '別バージョン',
        SUMMARY: '総集編',
        COMPILATION: 'コンピレーション',
        CONTAINS: '収録作品',
        CHARACTER: '関連キャラクター作品',
        OTHER: 'その他の関連作品',
      },
    },
    reviews: {
      // P1-4: レビュー/星評価・通報・コメント機能。
      sectionTitle: 'レビュー',
      loginPrompt: 'レビューを投稿するには',
      loginLink: 'ログイン',
      empty: 'まだレビューがありません。最初のレビューを投稿してみましょう。',
      form: {
        titleNew: 'レビューを投稿する',
        titleEdit: 'レビューを編集する',
        ratingLabel: '評価',
        bodyLabel: 'レビュー本文',
        bodyPlaceholder: 'この作品の感想を書いてください。',
        spoilerLabel: 'ネタバレを含む',
        submit: '投稿する',
        submitting: '投稿中…',
        update: '更新する',
        updating: '更新中…',
        submitSuccess: 'レビューを投稿しました。',
        updateSuccess: 'レビューを更新しました。',
        errors: {
          unauthorized: 'セッションの有効期限が切れました。再度ログインしてください。',
          invalidRating: '評価を選択してください。',
          bodyRequired: 'レビュー本文を入力してください。',
          bodyTooLong: `レビュー本文は ${MAX_REVIEW_BODY_LENGTH} 文字以内で入力してください。`,
          generic: '投稿に失敗しました。時間をおいて再度お試しください。',
        },
      },
      item: {
        spoilerHiddenNotice: 'このレビューにはネタバレが含まれています。',
        showSpoilerButton: 'ネタバレを表示する',
        reportButton: '報告する',
        alreadyReported: '報告済みです',
        reportDialogTitle: 'このレビューを報告',
        reportReasonLabel: '理由を選択してください。',
        reportReasons: {
          SPOILER: 'ネタバレが隠されていない',
          ABUSE: '誹謗中傷・嫌がらせ',
          SPAM: 'スパム・宣伝',
          OFF_TOPIC: '作品と関係のない内容',
          OTHER: 'その他',
        },
        cancel: 'キャンセル',
        reportSubmit: '報告する',
        reportSuccess: '報告しました。ご協力ありがとうございます。',
        reportErrors: {
          unauthorized: 'セッションの有効期限が切れました。再度ログインしてください。',
          reasonRequired: '理由を選択してください。',
          alreadyReported: 'このレビューはすでに報告済みです。',
          notFound: 'このレビューは見つかりませんでした。',
          generic: '報告に失敗しました。時間をおいて再度お試しください。',
        },
        commentsTitle: 'コメント',
        commentsEmpty: 'まだコメントがありません。',
        commentPlaceholder: 'コメントを入力…',
        commentSubmit: '送信',
        commentLoginPrompt: 'コメントするにはログインしてください。',
        commentErrors: {
          unauthorized: 'セッションの有効期限が切れました。再度ログインしてください。',
          bodyRequired: 'コメントを入力してください。',
          bodyTooLong: `コメントは ${MAX_COMMENT_BODY_LENGTH} 文字以内で入力してください。`,
          notFound: 'このレビューは見つかりませんでした。',
          generic: '送信に失敗しました。時間をおいて再度お試しください。',
        },
      },
      summary: {
        // P2-3: 別点区間別 AI レビュー要約。
        sectionTitle: 'AIレビュー要約',
        sectionDescription: 'Claude が星評価の区間ごとにレビューの傾向を要約します。',
        bandLabels: {
          HIGH: '高評価',
          MEDIUM: '中間評価',
          LOW: '低評価',
        },
        reviewCountLabel: (count: number) => `${count} 件のレビューを基に生成`,
        emptyBand: 'この区間にはまだレビューがありません。',
        unavailable: 'この区間の要約は現在生成できませんでした。時間をおいて再度お試しください。',
        insufficientNotice: `レビューが ${MIN_REVIEWS_FOR_SUMMARY} 件以上集まると、AIによる要約を表示します。`,
      },
    },
  },
  ranking: {
    // P1-5: ランキングトップ(マンガ/アニメへの導線のみ)。
    landing: {
      title: 'ランキング',
      description: '当サービスに投稿されたレビュー・星評価のみを基準にしたランキングです。',
      mangaCard: {
        title: 'マンガランキング',
        description: '原産国(韓国 / 日本)で絞り込めます。',
      },
      animeCard: {
        title: 'アニメランキング',
        description: 'ジャンル・シーズンで絞り込めます。',
      },
    },
    // マンガ/アニメ両ランキングで共通の文言。
    common: {
      averageRatingLabel: (average: string) => `平均 ${average} / 10`,
      reviewCountLabel: (count: number) => `レビュー ${count} 件`,
      noReviewsYet: 'まだレビューがありません',
      // AniList の popularity/averageScore/trending は一切使用せず、当サービスの
      // レビュー/星評価データのみで並び替えていることを利用者に明示する注記。
      methodologyNote:
        'このランキングは当サービスに投稿されたレビュー・星評価のみを基準に算出しています(AniList 上の人気度・平均スコアは使用していません)。',
      insufficientData: {
        badge: '情報不足',
        sectionTitle: 'レビュー数が少ない作品',
        sectionDescription: `レビュー数が ${MIN_REVIEW_COUNT_FOR_RANKING} 件未満のため、順位付けの対象外としています。件数が集まり次第、通常のランキングに反映されます。`,
      },
      // P2-6: 前日比の順位変動バッジ。スナップショットが2日分以上無いと表示されない
      // (server/services/rankingChanges.ts 参照)。
      rankChange: {
        up: (delta: number) => `▲ ${delta}`,
        down: (delta: number) => `▼ ${delta}`,
        same: '‒ 変動なし',
      },
      empty: {
        title: '該当する作品が見つかりません',
        description: 'フィルタ条件を変更するか、レビューが集まるまでお待ちください。',
      },
      pagination: {
        prev: '前へ',
        next: '次へ',
        pageOf: (current: number, total: number) => `${current} / ${total} ページ`,
      },
    },
    manga: {
      title: 'マンガランキング',
      description: '原産国(韓国/日本)で絞り込める、マンガ限定のランキングです。',
      countryFilterAll: 'すべて',
    },
    anime: {
      title: 'アニメランキング',
      description: 'ジャンル・シーズンで絞り込める、アニメ限定のランキングです。',
      genreFilterAll: 'すべてのジャンル',
      seasonFilterAll: 'すべてのシーズン',
      yearFilterAll: 'すべての年',
      yearLabel: (year: number) => `${year}年`,
    },
  },
  search: {
    // P2-1: Claude API を使った自然言語検索。
    title: '自然言語検索',
    description:
      '「復讐する成長型主人公が出てくる異世界物」のように、思いついた文章のまま検索できます。',
    formLabel: '検索キーワード',
    placeholder: '例: 復讐する成長型主人公が出てくる異世界物',
    submit: '検索する',
    // AniList の popularity/averageScore/trending は一切使用せず、当サービスの
    // レビュー/星評価データのみで並び替えていることを利用者に明示する注記
    // (ranking.common.methodologyNote と同じ趣旨)。
    methodologyNote:
      '検索結果も当サービスに投稿されたレビュー・星評価のみを基準に並び替えています(AniList 上の人気度・平均スコアは使用していません)。',
    matchedFiltersLabel: (genresAndTags: string[]) =>
      `この検索から抽出された条件: ${genresAndTags.join('、')}`,
    noQuery: {
      title: '文章で検索してみましょう',
      description: 'ジャンルやタグを直接指定しなくても、Claude が意図を汲み取って作品を探します。',
    },
    noMatch: {
      title: '一致するジャンル/タグが見つかりませんでした',
      description: '検索クエリを言い換えるか、より具体的なジャンル名・タグ名を含めてみてください。',
    },
    empty: {
      title: '該当する作品が見つかりません',
      description: '抽出された条件に一致する作品が、まだ自体データベースに同期されていません。',
    },
    errors: {
      queryTooLong: `検索クエリは ${MAX_SEARCH_QUERY_LENGTH} 文字以内で入力してください。`,
      rateLimited: '検索リクエストが混み合っています。しばらく時間をおいて再度お試しください。',
      claudeUnavailable: '検索機能に一時的に接続できませんでした。時間をおいて再度お試しください。',
      generic: '検索に失敗しました。時間をおいて再度お試しください。',
    },
  },
  chat: {
    // P2-2: Claude API を使った対話型おすすめチャットボット。
    title: 'おすすめチャットボット',
    description:
      '好きな作品や気になるジャンル・雰囲気を話しかけてください。Claude が質問を重ねながら、自体データベースに実在する作品だけをおすすめします。',
    inputLabel: 'メッセージ',
    placeholder: '例: バトルもの少年アニメで、主人公が成長していく話が好きです',
    send: '送信',
    sending: '送信中…',
    emptyConversation: {
      title: '好みを話しかけてみましょう',
      description: 'ジャンルや好きな作品、見たい雰囲気などを教えてください。',
    },
    recommendedWorksTitle: 'おすすめされた作品',
    errors: {
      messageTooLong: `メッセージは ${MAX_CHAT_MESSAGE_LENGTH} 文字以内で入力してください。`,
      historyTooLong:
        '会話が長くなりすぎました。ページを再読み込みして、新しい会話を始めてください。',
      rateLimited: 'リクエストが混み合っています。しばらく時間をおいて再度お試しください。',
      claudeUnavailable:
        'チャット機能に一時的に接続できませんでした。時間をおいて再度お試しください。',
      generic: '送信に失敗しました。時間をおいて再度お試しください。',
    },
  },
  home: {
    intro: {
      title: '君のアニメは',
      description:
        '日本・韓国のアニメ/マンガ情報を統合しておすすめする個人プロジェクトです。現在は初期スキャフォールディング段階です。',
    },
    // P1-6: 取り好みキーワード基準のコンテンツベースおすすめセクション。
    recommendations: {
      title: 'おすすめ作品',
      description: '登録した好みのキーワードと AniList のタグとの一致度からおすすめしています。',
      // P2-4: おすすめ理由の表示は Claude API が生成する自然文が主体になった。
      // これは Claude 呼び出し失敗時にのみ使う、一致キーワードを機械的に並べた
      // フォールバック文言(server/services/recommendationReasons.ts 参照)。
      reasonLabel: (keywords: string[]) => `一致したキーワード: ${keywords.join('、')}`,
      noKeywords: {
        title: '好みのキーワードが未設定です',
        description: 'マイページで好みのキーワードを登録すると、ここにおすすめ作品が表示されます。',
        action: 'マイページへ',
      },
      empty: {
        title: '一致するおすすめ作品が見つかりません',
        description:
          '登録したキーワードに一致する作品がまだありません。キーワードを見直してみてください。',
      },
    },
  },
} as const;
