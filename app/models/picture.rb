class Picture < ActiveRecord::Base
  mount_uploader :image, ImageUploader

  validate presence: true, uniqueness: true

  def from_string(file_name, file_data)
    self.image = AppSpecificStringIO.new(file_name, file_data)
  end
end
