package com.example.gmailapplication.adapters;

import android.graphics.Color;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.gmailapplication.R;
import com.example.gmailapplication.shared.Email;

import java.util.ArrayList;
import java.util.List;

public class EmailAdapter extends RecyclerView.Adapter<EmailAdapter.EmailViewHolder> {

    private List<Email> emails = new ArrayList<>();
    private OnEmailClickListener listener;
    private OnEmailDeleteListener deleteListener;
    private OnStarClickListener starListener;
    private OnEditDraftListener editDraftListener;
    private String currentUserEmail;
    private ReadStatusChecker readStatusChecker;


    public interface ReadStatusChecker {
        boolean isEmailRead(String emailId);
    }

    // Interfaces remain the same
    public interface OnEmailClickListener {
        void onEmailClick(Email email);
    }

    public interface OnEmailDeleteListener {
        void onEmailDelete(Email email);
    }

    public interface OnStarClickListener {
        void onStar(Email email);
    }

    public interface OnEditDraftListener {
        void onEditDraft(Email email);
    }

    public EmailAdapter(OnEmailClickListener listener, String currentUserEmail, ReadStatusChecker readStatusChecker) {
        this.listener = listener;
        this.currentUserEmail = currentUserEmail;
        this.readStatusChecker = readStatusChecker;
    }

    // Setters remain the same
    public void setDeleteListener(OnEmailDeleteListener deleteListener) {
        this.deleteListener = deleteListener;
    }

    public void setStarListener(OnStarClickListener starListener) {
        this.starListener = starListener;
    }

    public void setEditDraftListener(OnEditDraftListener editDraftListener) {
        this.editDraftListener = editDraftListener;
    }

    public void updateEmails(List<Email> newEmails) {
        System.out.println("=== ADAPTER DEBUG ===");
        System.out.println("updateEmails called with emails: " + (newEmails != null ? newEmails.size() : "null"));

        this.emails.clear();
        if (newEmails != null) {
            this.emails.addAll(newEmails);
        }
        System.out.println("Final adapter size: " + this.emails.size());
        notifyDataSetChanged();
        System.out.println("notifyDataSetChanged() called");
        System.out.println("==================");
    }

    @NonNull
    @Override
    public EmailViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_email, parent, false);
        return new EmailViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull EmailViewHolder holder, int position) {
        Email email = emails.get(position);

        boolean isRead = readStatusChecker != null && readStatusChecker.isEmailRead(email.id);

        holder.bind(email, isRead);
    }

    @Override
    public int getItemCount() {
        return emails.size();
    }

    class EmailViewHolder extends RecyclerView.ViewHolder {
        private TextView tvSenderAvatar, tvSender, tvSubject, tvPreview, tvTime;
        private ImageView ivSenderAvatar;
        private TextView tvLabels;
        private LinearLayout layoutLabels, layoutIndicators;
        private ImageView ivStar, ivMore, ivAttachment, ivImportant, ivSpamIndicator;

        public EmailViewHolder(@NonNull View itemView) {
            super(itemView);
            // Views from new layout
            tvSenderAvatar = itemView.findViewById(R.id.tvSenderAvatar);
            ivSenderAvatar = itemView.findViewById(R.id.ivSenderAvatar);
            tvSender = itemView.findViewById(R.id.tvSender);
            tvSubject = itemView.findViewById(R.id.tvSubject);
            tvPreview = itemView.findViewById(R.id.tvPreview);
            tvTime = itemView.findViewById(R.id.tvTime);
            tvLabels = itemView.findViewById(R.id.tvLabels);
            layoutLabels = itemView.findViewById(R.id.layoutLabels);
            layoutIndicators = itemView.findViewById(R.id.layoutIndicators);
            ivStar = itemView.findViewById(R.id.ivStar);
            ivMore = itemView.findViewById(R.id.ivMore);
            ivAttachment = itemView.findViewById(R.id.ivAttachment);
            ivImportant = itemView.findViewById(R.id.ivImportant);
            ivSpamIndicator = itemView.findViewById(R.id.ivSpamIndicator);

            setupClickListeners();
        }

        private void setupClickListeners() {
            // Click on email itself
            itemView.setOnClickListener(v -> {
                if (listener != null) {
                    int position = getAdapterPosition();
                    if (position != RecyclerView.NO_POSITION) {
                        listener.onEmailClick(emails.get(position));
                    }
                }
            });

            // Click on star
            if (ivStar != null) {
                ivStar.setOnClickListener(v -> {
                    if (starListener != null) {
                        int position = getAdapterPosition();
                        if (position != RecyclerView.NO_POSITION) {
                            starListener.onStar(emails.get(position));
                        }
                    }
                });
            }

            // Click on More button (options menu)
            if (ivMore != null) {
                ivMore.setOnClickListener(v -> {
                    if (deleteListener != null) {
                        int position = getAdapterPosition();
                        if (position != RecyclerView.NO_POSITION) {
                            // Currently using this for deletion, but could add PopupMenu
                            deleteListener.onEmailDelete(emails.get(position));
                        }
                    }
                });
            }
        }

        public void bind(Email email, boolean isRead) {
            boolean isDraft = isDraft(email);
            boolean isSpam = isSpam(email);
            boolean isImportant = isImportant(email);
            boolean isInInbox = email.labels != null && email.labels.contains("inbox");

            // Avatar - first letter of sender
            setupSenderAvatar(email);

            setupSender(email, isRead, isInInbox);

            setupSubject(email, isDraft, isSpam, isRead, isInInbox);

            setupPreview(email, isRead, isInInbox);

            setupTime(email, isRead, isInInbox);

            setupLabels(email);
            setupIndicators(email, isImportant, isSpam);
            setupStarButton(email);
            setupMoreButton();
        }

        private void setupSenderAvatar(Email email) {
            String senderEmail = email.sender != null ? email.sender : "?";
            String firstLetter = senderEmail.substring(0, 1).toUpperCase();
            tvSenderAvatar.setText(firstLetter);

            // Dynamic background color based on first letter
            int[] colors = {
                    Color.parseColor("#1a73e8"), // Blue
                    Color.parseColor("#34a853"), // Green
                    Color.parseColor("#fbbc04"), // Yellow
                    Color.parseColor("#ea4335"), // Red
                    Color.parseColor("#9c27b0"), // Purple
                    Color.parseColor("#ff6f00"), // Orange
            };

            int colorIndex = Math.abs(firstLetter.hashCode()) % colors.length;
            tvSenderAvatar.setBackgroundColor(colors[colorIndex]);

            tvSenderAvatar.setVisibility(View.VISIBLE);
            ivSenderAvatar.setVisibility(View.GONE);

            loadProfileImageByEmail(senderEmail);
        }

        private void loadCurrentUserProfileImage() {
            loadProfileImageByEmail(currentUserEmail);
        }

        private void loadProfileImageByEmail(String email) {
            if (email == null || email.isEmpty()) {
                return;
            }

            //  UserAPI instance
            com.example.gmailapplication.API.UserAPI userAPI =
                    com.example.gmailapplication.API.BackendClient.get(itemView.getContext())
                            .create(com.example.gmailapplication.API.UserAPI.class);

            userAPI.getAvatarByEmail(email).enqueue(new retrofit2.Callback<okhttp3.ResponseBody>() {
                @Override
                public void onResponse(retrofit2.Call<okhttp3.ResponseBody> call, retrofit2.Response<okhttp3.ResponseBody> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        try {
                            byte[] imageBytes = response.body().bytes();
                            android.graphics.Bitmap bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

                            if (bitmap != null) {
                                if (itemView.getContext() instanceof android.app.Activity) {
                                    ((android.app.Activity) itemView.getContext()).runOnUiThread(() -> {
                                        tvSenderAvatar.setVisibility(View.GONE);
                                        ivSenderAvatar.setVisibility(View.VISIBLE);

                                        android.graphics.Bitmap circularBitmap = createCircularBitmap(bitmap);
                                        ivSenderAvatar.setImageBitmap(circularBitmap);
                                    });
                                }
                            }
                        } catch (Exception e) {
                            System.out.println("Error loading profile image by email: " + e.getMessage());
                        }
                    }
                }

                @Override
                public void onFailure(retrofit2.Call<okhttp3.ResponseBody> call, Throwable t) {
                    System.out.println("Failed to load profile image by email: " + t.getMessage());
                }
            });
        }

        private android.graphics.Bitmap createCircularBitmap(android.graphics.Bitmap bitmap) {
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            int size = Math.min(width, height);

            android.graphics.Bitmap output = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
            android.graphics.Canvas canvas = new android.graphics.Canvas(output);

            android.graphics.Paint paint = new android.graphics.Paint();
            paint.setAntiAlias(true);

            canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
            paint.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN));

            canvas.drawBitmap(bitmap, (size - width) / 2f, (size - height) / 2f, paint);

            return output;
        }



        private void setupSender(Email email, boolean isRead, boolean isInInbox) {
            String senderText = email.sender != null ? email.sender : itemView.getContext().getString(R.string.unknown_sender);
            tvSender.setText(senderText);

            if (isInInbox && !isRead) {
                tvSender.setTypeface(Typeface.DEFAULT_BOLD);
                tvSender.setTextColor(itemView.getContext().getColor(R.color.gmail_text_primary)); // דינמי
            } else {
                tvSender.setTypeface(Typeface.DEFAULT);
                tvSender.setTextColor(itemView.getContext().getColor(R.color.gmail_text_secondary)); // דינמי
            }
        }

        private void setupSubject(Email email, boolean isDraft, boolean isSpam, boolean isRead, boolean isInInbox) {
            String subject = email.subject != null && !email.subject.trim().isEmpty()
                    ? email.subject : itemView.getContext().getString(R.string.no_subject);

            if (isDraft) {
                subject = itemView.getContext().getString(R.string.draft_prefix, subject);
                tvSubject.setTextColor(Color.parseColor("#ff6f00")); // Orange
                tvSubject.setTypeface(Typeface.DEFAULT); // Drafts are not bold
            } else if (isSpam) {
                tvSubject.setTextColor(Color.parseColor("#ea4335")); // Red
                tvSubject.setTypeface(Typeface.DEFAULT); // Spam is not bold
            } else {
                if (isInInbox && !isRead) {
                    tvSubject.setTypeface(Typeface.DEFAULT_BOLD);
                    tvSubject.setTextColor(itemView.getContext().getColor(R.color.gmail_text_primary)); // דינמי
                } else {
                    tvSubject.setTypeface(Typeface.DEFAULT);
                    tvSubject.setTextColor(itemView.getContext().getColor(R.color.gmail_text_secondary)); // דינמי
                }
            }
            tvSubject.setText(subject);
        }

        private void setupPreview(Email email, boolean isRead, boolean isInInbox) {
            String preview = email.content;
            if (preview != null && preview.length() > 100) {
                preview = preview.substring(0, 100) + "...";
            }
            tvPreview.setText(preview != null ? preview : itemView.getContext().getString(R.string.no_content));

            if (isInInbox && !isRead) {
                tvPreview.setTypeface(Typeface.DEFAULT_BOLD);
                tvPreview.setTextColor(itemView.getContext().getColor(R.color.gmail_text_primary)); // דינמי
            } else {
                tvPreview.setTypeface(Typeface.DEFAULT);
                tvPreview.setTextColor(itemView.getContext().getColor(R.color.gmail_text_secondary)); // דינמי
            }
        }

        private void setupTime(Email email, boolean isRead, boolean isInInbox) {
            if (email.timestamp != null) {
                try {
                    String timeStr = email.timestamp.length() > 16
                            ? email.timestamp.substring(11, 16)
                            : email.timestamp;
                    tvTime.setText(timeStr);
                } catch (Exception e) {
                    tvTime.setText(itemView.getContext().getString(R.string.unknown_time));
                }
            } else {
                tvTime.setText(itemView.getContext().getString(R.string.unknown_time));
            }

            if (isInInbox && !isRead) {
                tvTime.setTypeface(Typeface.DEFAULT_BOLD);
                tvTime.setTextColor(itemView.getContext().getColor(R.color.gmail_text_primary)); // דינמי
            } else {
                tvTime.setTypeface(Typeface.DEFAULT);
                tvTime.setTextColor(itemView.getContext().getColor(R.color.gmail_text_secondary)); // דינמי
            }
        }

        private void setupLabels(Email email) {
            if (email.labels != null && !email.labels.isEmpty()) {
                // Show only custom labels (not system)
                List<String> customLabels = new ArrayList<>();
                for (String label : email.labels) {
                    if (!isSystemLabel(label)) {
                        customLabels.add(label);
                    }
                }

                if (!customLabels.isEmpty()) {
                    String labelsText = customLabels.get(0); // Show only one label
                    if (customLabels.size() > 1) {
                        labelsText += " " + itemView.getContext().getString(R.string.additional_labels, (customLabels.size() - 1));
                    }

                    tvLabels.setText(labelsText);
                    layoutLabels.setVisibility(View.VISIBLE);
                } else {
                    layoutLabels.setVisibility(View.GONE);
                }
            } else {
                layoutLabels.setVisibility(View.GONE);
            }
        }

        private void setupIndicators(Email email, boolean isImportant, boolean isSpam) {
            boolean hasIndicators = false;

            // Spam indicator
            if (ivSpamIndicator != null) {
                if (isSpam) {
                    ivSpamIndicator.setVisibility(View.VISIBLE);
                    hasIndicators = true;
                } else {
                    ivSpamIndicator.setVisibility(View.GONE);
                }
            }

            // Important indicator
            if (ivImportant != null) {
                if (isImportant) {
                    ivImportant.setVisibility(View.VISIBLE);
                    hasIndicators = true;
                } else {
                    ivImportant.setVisibility(View.GONE);
                }
            }

            // Attachment indicator (placeholder logic)
            if (ivAttachment != null) {
                // Currently hide since we don't have attachment info
                ivAttachment.setVisibility(View.GONE);
            }

            // Show/hide indicators layout
            if (layoutIndicators != null) {
                layoutIndicators.setVisibility(hasIndicators ? View.VISIBLE : View.GONE);
            }
        }

        private void setupStarButton(Email email) {
            if (ivStar != null) {
                boolean isStarred = email.labels != null && email.labels.contains("starred");

                if (isStarred) {
                    ivStar.setImageResource(android.R.drawable.btn_star_big_on);
                    ivStar.setColorFilter(Color.parseColor("#fbbc04")); // Gold yellow
                } else {
                    ivStar.setImageResource(android.R.drawable.btn_star_big_off);
                    ivStar.setColorFilter(Color.parseColor("#9aa0a6")); // Light gray
                }
            }
        }

        private void setupMoreButton() {
            if (ivMore != null) {
                // Show More button only if deleteListener exists
                if (deleteListener != null) {
                    ivMore.setVisibility(View.VISIBLE);
                } else {
                    ivMore.setVisibility(View.GONE);
                }
            }
        }

        private boolean isSystemLabel(String label) {
            return label.equals("inbox") || label.equals("sent") || label.equals("drafts") ||
                    label.equals("spam") || label.equals("starred") || label.equals("trash") ||
                    label.equals("important");
        }

        private boolean isDraft(Email email) {
            return (email.labels != null && email.labels.contains("drafts"));
        }

        private boolean isSpam(Email email) {
            return (email.labels != null && email.labels.contains("spam"));
        }

        private boolean isImportant(Email email) {
            return (email.labels != null && email.labels.contains("important"));
        }


    }
}