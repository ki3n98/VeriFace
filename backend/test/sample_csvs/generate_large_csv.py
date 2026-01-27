import csv

# Generate CSV with exactly 500 rows
with open('large_500_users.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['first_name', 'last_name', 'email'])
    for i in range(1, 501):
        writer.writerow([f'User{i}', f'Test{i}', f'user{i}@example.com'])

print("Created large_500_users.csv with 500 rows")

# Generate CSV with 501 rows (should fail validation)
with open('large_501_users.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['first_name', 'last_name', 'email'])
    for i in range(1, 502):
        writer.writerow([f'User{i}', f'Test{i}', f'user{i}@example.com'])

print("Created large_501_users.csv with 501 rows (exceeds limit)")

# Generate CSV with 50 rows (moderate size)
with open('medium_50_users.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['first_name', 'last_name', 'email'])
    for i in range(1, 51):
        writer.writerow([f'User{i}', f'Test{i}', f'user{i}@example.com'])

print("Created medium_50_users.csv with 50 rows")
