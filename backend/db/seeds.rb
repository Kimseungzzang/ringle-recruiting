# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

[ Permission::STUDY, Permission::CONVERSE, Permission::ANALYZE ].each do |name|
  Permission.find_or_create_by!(name: name)
end

[ Locale::KO, Locale::ENG ].each do |name|
  Locale.find_or_create_by!(name: name)
end

topics_seed = [
  {
    title: "자기소개하기",
    title_en: "Introducing One's Name and Role at Work",
    paragraphs: [
      {
        Locale::KO => "새로운 사람을 만나는 비즈니스 환경에서 본인을 소개해보세요.",
        Locale::ENG => "Introduce yourself in a business setting where you meet someone new."
      },
      {
        Locale::KO => "이름, 소속, 담당 업무를 순서대로 말하는 연습을 해보세요.",
        Locale::ENG => "Practice saying your name, affiliation, and role in that order."
      }
    ]
  },
  {
    title: "이메일로 일정 조율하기",
    title_en: "Scheduling a Meeting by Email",
    paragraphs: [
      {
        Locale::KO => "동료에게 회의 일정을 제안하고 조율하는 상황을 연습해보세요.",
        Locale::ENG => "Practice proposing and adjusting a meeting time with a colleague."
      },
      {
        Locale::KO => "가능한 시간대를 제시하고, 상대의 일정에 맞춰 조정하는 표현을 연습해보세요.",
        Locale::ENG => "Practice suggesting available times and adjusting to the other person's schedule."
      }
    ]
  },
  {
    title: "회의에서 의견 제시하기",
    title_en: "Sharing Your Opinion in a Meeting",
    paragraphs: [
      {
        Locale::KO => "팀 회의에서 자신의 의견을 논리적으로 전달하는 상황을 연습해보세요.",
        Locale::ENG => "Practice clearly presenting your opinion during a team meeting."
      },
      {
        Locale::KO => "동의와 반대 의견을 정중하게 표현하는 연습을 해보세요.",
        Locale::ENG => "Practice politely agreeing and disagreeing with others' opinions."
      }
    ]
  },
  {
    title: "프레젠테이션으로 성과 공유하기",
    title_en: "Presenting Results to Your Team",
    paragraphs: [
      {
        Locale::KO => "분기별 성과를 팀에게 발표하는 상황을 연습해보세요.",
        Locale::ENG => "Practice presenting quarterly results to your team."
      },
      {
        Locale::KO => "숫자와 그래프를 설명하고, 다음 계획을 제안하는 표현을 연습해보세요.",
        Locale::ENG => "Practice explaining figures and charts, and proposing next steps."
      }
    ]
  },
  {
    title: "네트워킹 행사에서 스몰토크하기",
    title_en: "Small Talk at a Networking Event",
    paragraphs: [
      {
        Locale::KO => "업계 행사에서 처음 만난 사람과 편하게 대화를 시작해보세요.",
        Locale::ENG => "Practice starting a casual conversation with someone you just met at an industry event."
      },
      {
        Locale::KO => "관심사와 근황을 주고받으며 자연스럽게 대화를 이어가는 연습을 해보세요.",
        Locale::ENG => "Practice keeping the conversation going by exchanging interests and updates."
      }
    ]
  }
]

topics_seed.each do |topic_attrs|
  topic = Topic.find_or_initialize_by(title: topic_attrs[:title])
  topic.title_en = topic_attrs[:title_en]
  topic.save!

  topic_attrs[:paragraphs].each_with_index do |translations, index|
    paragraph = TopicParagraph.find_or_create_by!(topic: topic, position: index)

    translations.each do |locale_name, content|
      locale = Locale.find_by!(name: locale_name)
      translation = TopicParagraphTranslation.find_or_initialize_by(topic_paragraph: paragraph, locale: locale)
      translation.content = content
      translation.save!
    end
  end
end

memberships_seed = [
  { name: "베이직", permissions: [ Permission::STUDY ], duration_days: 30, price: 129_000 },
  {
    name: "프리미엄",
    permissions: [ Permission::STUDY, Permission::CONVERSE, Permission::ANALYZE ],
    duration_days: 60,
    price: 219_000
  }
]

memberships_seed.each do |attrs|
  membership = Membership.find_or_create_by!(name: attrs[:name]) do |m|
    m.duration_days = attrs[:duration_days]
    m.price = attrs[:price]
  end
  membership.permissions = Permission.where(name: attrs[:permissions])
end

# 시연/채점용 데모 계정 — README에 안내된 비밀번호와 동일해야 함.
# login_id/password는 Member 모델 검증(최소 10자)을 만족해야 함.
# ringle_admin: 어드민 UI(멤버십 관리) 테스트용. ringle_demo: 멤버십이 없는
# 상태(구매 플로우 테스트용). demo_premium: 프리미엄 멤버십을 이미 보유
# (학습 대화 화면 바로 테스트용).
demo_accounts_seed = [
  { login_id: "ringle_admin", username: "관리자", role: :admin, membership: nil },
  { login_id: "ringle_demo", username: "데모유저", role: :user, membership: nil },
  { login_id: "demo_premium", username: "데모유저(프리미엄)", role: :user, membership: "프리미엄" }
]

demo_accounts_seed.each do |attrs|
  member = Member.find_or_create_by!(login_id: attrs[:login_id]) do |m|
    m.password = "password123"
    m.username = attrs[:username]
    m.role = attrs[:role]
  end

  next unless attrs[:membership]

  membership = Membership.find_by!(name: attrs[:membership])
  Memberships::Grant.new(member_id: member.id, membership_id: membership.id, price_at_purchase: 0).call unless member.member_membership
end
