class AddDeletedAtIndexesToMembersAndTopics < ActiveRecord::Migration[8.1]
  def change
    # Member.active / Topic.active(where(deleted_at: nil)) 스코프가 로그인,
    # 회원/주제 목록 조회 등 거의 모든 조회 경로에서 쓰이는데 인덱스가 없었음.
    add_index :members, :deleted_at
    add_index :topics, :deleted_at
  end
end
